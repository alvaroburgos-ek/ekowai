# Guideline → Tool — Plan 3 (Phase 5: encode the 29 inventoried standards as guideline-driven tools) Work-Order Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan **one standard per subagent, strictly sequentially** (repo doctrine: never two standards in flight). Steps use checkbox (`- [ ]`) syntax for tracking. Each standard task is self-contained: the subagent needs this task, the playbook, the doctrine in Appendix A (paste verbatim), the inventory file and the transcript path(s) named in the task — nothing else from chat memory.

**Goal:** Turn each of the 29 Blumen-Forschel production standards into a guideline-driven tool on the mechanism Plans 1, 2a and 2b built: the guideline's own tables become `regulation_tables` rows (verbatim-quoted), category fields become `select_one`/`select_many`, "one of N" groups become `register` fields with per-row lookups and aggregates, "bei/wenn/nur für" becomes `visible_when`, and every "ergibt sich aus" becomes a formula-string equation — without typing a single value that is not lifted from the transcript in the same session.

**Architecture:** Nothing new in code paths. Per standard the executor produces (1) a seed builder `src/lib/eval/regulation-tables-seed-<slug>.ts` (mirror of the A138 builder) → emitted seed migration + rollback; (2) a field-config module `src/lib/eval/field-configs/<slug>.ts` (widget + `ui_config` + `lookup` + `visible_when` + section `visible_when`, zod-validated by `parseFieldConfig`) → emitted field-config migration + rollback; (3) an equations module `src/lib/eval/equations/<slug>.ts` (formula strings, `input_symbols`, clause) → emitted equation INSERT migration + rollback; (4) pin tests (builder shape + transcript-substring check, config contract, render with a 2-row fixture, formula parse + engine eligibility); (5) a STAGED rulings file for every judgment item and one entry per item in `SIGN-OFF-plan-3.md`. Task 0 adds the three small emitters and the transcript-substring verifier the per-standard tasks call; Task 30 closes out (apply order, playbook, token-cost ratio).

**Tech Stack:** Next.js 16 / React 19, Drizzle (schema only — no schema change in this plan), raw SQL data migrations under `scripts/migrations/` with rollbacks under `scripts/`, zod 4 (`parseFieldConfig`), `src/lib/expr` (Plan 2a parser/evaluator), vitest (`pnpm test` = unit project; `pnpm vitest run --project integration` = embedded Postgres harness under `tests/harness/`).

**Spec:** `docs/superpowers/specs/2026-09-11-guideline-to-tool-generic-fields-design.md` §4 (nine shapes, method patterns, discriminator note), §7 (encoder procedure + override policies — binding, quoted in §"Global Constraints" below), §8 phase 5, §10 (rollout order), §12–13. Playbook: `docs/superpowers/guideline-to-tool-playbook.md` (Steps 1–6, apply-order constraint). Inventories: `docs/superpowers/specs/2026-09-11-guideline-to-tool/inventory/<CODE>.md` (29 files, each with §1 tables, §2 groups, §3 conditionals, §4 derived, §5 top wins, transcript line refs). Plan 1: `docs/superpowers/plans/2026-09-11-guideline-to-tool-plan-1-schema-tables-configs.md` (Tasks 2–5, 8). Plan 2a: `docs/superpowers/plans/2026-09-16-guideline-to-tool-plan-2a-expression-language-visibility-materialiser.md` (Task 2 functions, Task 5 register rows/configs/table fallback, Task 6 formula-string equations + migration pattern, Task 10 `visible_when`). Plan 2b (`docs/superpowers/plans/2026-09-16-guideline-to-tool-plan-2b-generic-editors.md`) did not exist on 2026-09-17 when this plan was written; this plan assumes its stated contract: the generic editor renders every `RegisterColumn` type (`text number boolean enum date lookup_key lookup_value derived`), the `lookup_fill` and `reference` field widgets, register flags, and per-column `visible_when` referencing the row's `discriminator` column.

**Branch / worktree:** `feat/guideline-to-tool` in `C:\Users\Ekowai\_wt-g2t` (HEAD `3a48ee3` when this plan was written; Plan 2a Tasks 1–2 landed, Tasks 3–12 and all of Plan 2b in progress by other agents). **Precondition for Task 1:** Plan 2a Tasks 5, 6, 10 and Plan 2b's `RegisterEditor` + `lookup_fill` renderer are merged on this branch and `pnpm test` is green — a standard task must not start against a half-built mechanism (the first task's token-cost measurement would be meaningless). Run every command from the worktree. Commit as Alvaro (`git config user.email` = `alvaro.burgos@ekowai.com`). Never run `scripts/apply-migration.mjs`, `drizzle-kit`, `vercel`, or any DB write from an assistant session; `node scripts/verification/prod-query.mjs` (read-only; lives on `main` at `C:\Users\Ekowai\projects\ekowai-wizard\scripts\verification\prod-query.mjs` — copy it onto this branch in Task 0, it reads `DATABASE_URL_PROD` from `.env.local` and never prints it) is allowed.

## Global Constraints (verbatim, binding — every subagent brief repeats these)

1. **SR-1 never-invent.** No table cell, option label, threshold, factor, default or range is typed into a builder, a config, an equation or a migration unless it is quoted verbatim from the transcript **in the same session**, into `verbatim_quote` (table rows), `verification_quote` (fields/equations) or `override_quote` (tables). Inventories cite transcript line ranges — they are pointers, NOT sources: the executor opens the transcript at those lines and lifts the row from there. If a cell is unreadable (OCR gap, table rendered as image, merged cells, garbled row) → STOP that row: do not seed it, write a sign-off entry naming the table, row and the transcript line, continue with the rest. This plan itself contains NO values: every value slot reads "lift from transcript L…".
2. **`verbatim_quote` in every table row** (`regulation_table_rows.verbatim_quote NOT NULL`, DDL comment "SR-1: the printed row, quoted verbatim from the standard transcript"). A row whose quote is synthesised from code constants or from the inventory text ships `verification_status = 'imported_unverified'` on its table; a table whose every row quote is lifted from the transcript ships `'md_verified'` (VC grade — markdown is the SR-1 source per owner ruling 2026-09-05; PDF confirmation (VA) is a later pass). `regulation_tables.verification_status` is free text (no CHECK) — use exactly these two tokens.
3. **Owner rulings (standing).** (a) **D-1 — never overwrite non-null prod `enum_values`**: capture prod's current `enum_values` read-only before emitting; a field whose prod `enum_values` is non-null keeps them byte-identical (`keepProdEnum`), the migration writes only `widget`/`ui_config`/`lookup`/`visible_when`; a mismatch between prod options and the printed list is a sign-off entry, never an edit. (b) **Fixed options ⇒ selection, never free text** (2026-08-01): a text field whose transcript sentence prints a closed list becomes `select_one`/`select_many`; the `data_type` change text→enum is a structure change and goes to the STAGED file with ☐ RATIFIED, the `widget`/`enum_values` write (into a null `enum_values`) goes into the migration. (c) **Single-source derivation**: each physical quantity is produced once by one registered equation, read-only, inherited by reference — a re-typed duplicate is retired by inheritance (`consumer_worksheets`), never by a second equation; collapsing duplicate FIELDS (deactivation) is structural → STAGED. (d) **Content-boundary rule**: a bare pointer to another document (DIN EN 12056-3 Tab. C.1, KOSTRA, DIN 19650, BBodSchV, §124 GWB, EN 124…) is a `reference` field or a `reference` register column, never an expanded option list or a seeded table; if the referenced standard is in the corpus, its table is the governing one and is seeded under THAT standard's task, not here.
4. **Spec §7 encoder procedure (first hit wins, cue quoted into `verification_quote`):** (1) computed by the guideline → `derived`; (2) pointer → `reference`; (3) arbitrary number alike → `register`; (4) both axes closed → `grid`; (5) printed table gives a value per class → key `select_one` + target `lookup_fill` (role `limit` if bounded); (6) fixed options → `select_one`/`select_many`; (7) duty without number → `attestation`; (8) else `scalar` with the sentence that leaves it open; (9) meaningful only under a condition → add `visible_when`. Single vs multi: single for "eine der", "entweder…oder", singular category nouns, exclusive tiers, tables whose row is the thing; multi for "und/oder", "ggf. mehrere", "eine oder mehrere", "mindestens eine der folgenden", plural co-existing parts; tie-break: can two apply to the same object at once? If each option also carries attributes → `register`.
5. **Spec §7 override policy per table, from the guideline's own words, quoted in `override_quote`:** `locked` ("ist anzusetzen", "gilt", "muss", every limit row, tier mappings) → no override, deviation goes to the documented-deviation workstream; `anhaltswert` ("Anhaltswert", "Richtwert", "in der Regel", "kann angepasst werden") → toggle + reason, table value stays visible; `kann` (printed alternatives, e.g. A-178 Tab. 1 η_VS 0 / 0,2) → choice among printed alternatives only; `messwert` ("sofern keine Messwerte vorliegen") → measured value replaces table value with provenance field required. The cue phrase each task names below is the inventory's paraphrase; the executor quotes the transcript sentence itself.
6. **Migrations WRITTEN-NOT-APPLIED**, each with a rollback, generated by the emitters (never hand-written INSERT/UPDATE), each standard's files independent of every other standard's, applied by the owner in the order Task 30 records (after Plan-1 schema, Plan-1 seed, Plan-2a migrations, Plan-2b migrations). Code must behave correctly with none of them applied (`widget IS NULL` ⇒ today's rendering; missing seed ⇒ TS builder fallback via `resolveRegulationTable`; missing equation rows ⇒ the derived symbol simply stays absent).
7. **One standard at a time, one subagent per standard**, the orchestrator verifies each result (raw `pnpm test` output, `git log`, file listing) before the next launches. Never two standards in parallel — shared files (`emit-*.ts` registries, `SIGN-OFF-plan-3.md`, `md-packs.order`-style ledgers) would conflict and the token-cost measurement would blur.
8. **Every judgment item → `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md`** (one block per item: standard · worksheet · symbol/table · what was chosen or left open · verbatim evidence with transcript line · proposed SQL or config · ☐ RATIFIED ☐ REJECTED ☐ DEFER). Judgment items never block the task; the executor makes the fail-safe choice (visible, warn, `imported_unverified`, no gate change) and records it. Classes that are ALWAYS sign-off: replacing an existing `verified_against_standard` equation; any gate condition change (`IF driver == x THEN …` guards); severity; `is_required`; `data_type`; field deactivation; `consumer_worksheets` edits; a `visible_when` whose driver is `select_many`/free text; a range where the standard gives no point (SR-2); a formula the standard describes in words but does not print; a table cell that is unreadable.
9. **Verification per task (playbook Step 6):** `pnpm test` and `pnpm -s typecheck` clean (raw output pasted in the report); the standard's harness chain (`pnpm vitest run --project integration tests/harness/<harness files named in the task>`) green; inventory §5 top-wins walked and each marked encoded / partially / deferred-with-reason; sign-off entries written; report at `docs/superpowers/specs/2026-09-11-guideline-to-tool/reports/plan-3-<slug>.md` with the counts table this plan's Task 30 aggregates.
10. **Commit trailer:** every commit message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. One commit per standard task (plus one for Task 0 and one for Task 30); no commit touches another standard's files.

## Source transcripts (verified by `ls` on 2026-09-17 — exact paths; nothing else may be used as the SR-1 source)

| # | Standard | Transcript path(s) found | Grade / notes |
|---|---|---|---|
| 1 | DWA-A-138-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).md` | md · Tab. 10 is an image (L1373) → not seedable |
| 2 | DIN-1989-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-1989-1\DIN-1989-1.md` | md · Tab. 4 OCR "V" for "l" (verify cells) |
| 3 | DWA-A-262E | `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-262E\DWA-A_262E (2).md` | md (English edition, LaTeX tables) · Table 21 last row truncated, Table 19 image |
| 4 | DWA-M-277E | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-277E\DWA-M_277E (1).md` | md (English) |
| 5 | DWA-M-1200-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-1200-1\DWA-M_1200-1_GD.md` | md · Tab. 8 class column OCR-damaged, Tab. 27 class-C E. coli cell merged |
| 6 | DWA-M-1200-3 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-1200-3\DWA-M_1200-3_GD.md` | md |
| 7 | FLL-GAR-2023 | `C:\Users\Ekowai\Desktop\Supabase data\Guidelines knowledge markdown\FLL-Gewässerabdichtungsrichtlinien.md` | md (no folder under `Desktop\Guidelines`) · Tab. 2 rows garbled, Tab. 26 column alignment uncertain |
| 8 | FLL-Naturteich | `C:\Users\Ekowai\Desktop\Supabase data\Guidelines knowledge markdown\FLL-Guidelines natural pool.md`; secondary `C:\Users\Ekowai\Desktop\FLL Guidelines PDF\FLL-Naturteich-2017_pdftotext.txt` | md (English 2017) · Table 1 columns interleaved |
| 9 | DWA-M-820-3 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-3\DWA-M_820-3.md` | md |
| 10 | DIN-18130-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-18130-1\DIN-18130-1.md` (also `DIN-18130-1_OCR.md`) | md · Tab. 5 merged cells |
| 11 | DWA-M-205 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-205\DWA-M_205.md` | md |
| 12 | DWA-M-187 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-187\DWA-M_187_GD.md` | md · Tabelle 2 unit OCR "l/(s·m²)²" |
| 13 | DIN-276 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-276\DIN-276.md` | md (English translation) |
| 14 | DWA-A-178 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-178\DWA-A_178.md` | md |
| 15 | DIN-EN-16941-2 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-EN-16941-2\DIN-EN-16941-2.md` | md |
| 16 | DWA-M-1200-2 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-1200-2\DWA-M_1200-2_GD.md` | md |
| 17 | DIN-1989-2 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-1989-2\DIN-1989-2.md` | md · Tab. 1 header partly image; EN 12056-3 Tab. C.1 not in transcript (external) |
| 18 | DWA-M-820-1 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-1\DWA-M_820-1.md` | md |
| 19 | DWA-M-820-2 | `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-2\DWA-M_820-2.md` | md |
| 20 | ISO-5667-10 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 5667-10\ISO-5667-10.txt` | **txt, Spanish translation** — convenience extraction (VC), not markdown; quote as-is, note language in every quote |
| 21 | ISO-59020 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 59020\ISO-59020-Unlocked.txt` | **txt** (English) — VC |
| 22 | ISO-46001 | `C:\Users\Ekowai\Desktop\Guidelines\_site_audit\ISO-46001\_46001_raw.txt` (layout variant `_46001_layout.txt`) | **txt, raw two-column extraction** — Table D.1 column pairing must be verified against `_46001_layout.txt` before any row is lifted |
| 23 | ISO-5667-6 | `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 5667-6\ISO-5667-6-2015.txt` | **txt, Spanish** — VC |
| 24 | VSME | **NONE** (only `C:\Users\Ekowai\Desktop\environmental-reporting service\01_Referenz\VSME Standard.pdf`, `VSME-Digital-Template-latest.xlsx`, XBRL zip) | no transcript → no table seeding; registers/visibility/equations only, quotes restricted to prod `verification_quote` text already carrying "Para NN" wording (grade EV) |
| 25 | DIN-14021 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-14021\DIN-EN-ISO-14021.md` | md (bilingual DE/EN) |
| 26 | ISO-14046 | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\ISO-14046\ISO-14046.md` | md, **Spanish IDT adoption** — VC; enum labels in prod are English (from another copy) |
| 27 | ATV-A-704E | **NONE** (`C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ATV A 704E\ATV-A-704E-Operating-Methods-for-Wastewater-Analysis.pdf` is a scan without text layer; `_encode_report.md` is second-hand) | no transcript → no table seeding; every IGC-Card value is a sign-off item |
| 28 | ISO-5667-1 | **NONE** (`C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 5667-1\ISO-5667-1.pdf` = NTC-ISO 5667-1 1995 Spanish translation of the 1980 edition, text-readable) | no md/txt → no table seeding; the §16.4 K table is a sign-off item pending a PDF-page quote (VA path) |
| 29 | ISO-59004 | **NONE** (`C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 59004\ISO_FDIS_59004_N.pdf`, FDIS) | no transcript → registers/checklists/visibility only |

Standards with no transcript (24, 27, 28, 29) and the txt-only ones (20–23, 26) are deliberately last in the order below: their table content cannot be seeded under rule 1, so their tasks encode structure (registers, selections, `visible_when`, equations whose inputs are engineer data) and route every printed value to the sign-off sheet.

## File map

| File | Responsibility |
|---|---|
| `scripts/verification/prod-query.mjs` (copy from `main`) | read-only prod runner used to capture `enum_values`, `consumer_worksheets`, section codes and existing equation rows before emitting |
| `scripts/regulation-tables/emit-seed-sql.ts` (modify, Task 0) | CLI takes a slug; `SEED_BUILDERS[slug]` → `{ build: () => RegulationTable[]; ts: string }`; writes `scripts/migrations/<ts>_regulation_tables_seed_<slug>.sql` + `scripts/rollback-<ts>-regulation-tables-seed-<slug>.sql` |
| `scripts/regulation-tables/emit-field-configs-sql.ts` (create, Task 0) | emits `UPDATE fields … SET widget, ui_config, lookup, visible_when [, enum_values]` and `UPDATE worksheet_sections … SET visible_when` from `src/lib/eval/field-configs/<slug>.ts` + captured `<slug>.prior.json`; writes `scripts/migrations/<ts>_field_configs_<slug>.sql` + rollback |
| `scripts/regulation-tables/emit-equations-sql.ts` (create, Task 0) | emits `INSERT INTO equations … ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING` from `src/lib/eval/equations/<slug>.ts`; writes `scripts/migrations/<ts>_equations_<slug>.sql` + rollback (DELETE the inserted `(worksheet, equation_number)` pairs) |
| `scripts/regulation-tables/verify-regulation-tables.ts` (create, Task 0) | spec §9 risk 2: for a slug, every `verbatim_quote` must occur (whitespace-normalised) in the transcript file given on the CLI; prints a per-row PASS/FAIL list — pasted into the task report |
| `src/lib/eval/field-configs/types.ts` (create, Task 0) | `FieldConfigEntry`, `SectionVisibilityEntry`, `EquationEntry` types (below) |
| `src/lib/eval/regulation-tables-seed-<slug>.ts` (create, one per standard with tables) | pure builders returning `RegulationTable[]`, rows lifted from the transcript |
| `src/lib/eval/field-configs/<slug>.ts` (create, one per standard) | `FIELD_CONFIGS: FieldConfigEntry[]`, `SECTION_VISIBILITY: SectionVisibilityEntry[]` |
| `src/lib/eval/equations/<slug>.ts` (create, one per standard with derived values) | `EQUATIONS: EquationEntry[]` |
| `src/lib/eval/__tests__/regulation-tables-seed-<slug>.test.ts` | builder pin: shape, key uniqueness, printed row count, every quote non-empty; transcript substring check when `GUIDELINE_TRANSCRIPT_<SLUG>` env var points at the file (skipped otherwise, never failing CI) |
| `src/lib/eval/__tests__/field-configs-<slug>.test.ts` | every entry passes `parseFieldConfig`; every `visible_when` parses via `parseCondition`; every register `derived.expr` parses via `parseNumeric`; every `lookup`/column lookup names a `table_code` the slug's builder (or A138's) provides |
| `src/lib/eval/__tests__/equations-<slug>.test.ts` | every formula parses via `parseNumeric`, `validateEngineEligibility(formula, input_symbols, fields)` verified, and evaluates against a 2-row fixture through `evaluateFormula` |
| `src/components/worksheet/__tests__/register-<slug>.test.tsx` | the generic `RegisterEditor` renders each register config with a 2-row fixture: column headers, lookup fill on key change, footer aggregate |
| `scripts/migrations/<ts>_regulation_tables_seed_<slug>.sql`, `<ts>_field_configs_<slug>.sql`, `<ts>_equations_<slug>.sql` (+ `scripts/rollback-<ts>-…sql`) | generated, never hand-edited |
| `scripts/verification/<slug>-STAGED-plan3-rulings.sql` | commented SQL with ☐ RATIFIED markers: gate guards, data_type changes, equation replacements, deactivations, consumer edits |
| `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md` | one block per judgment item (skeleton in Task 0) |
| `docs/superpowers/specs/2026-09-11-guideline-to-tool/reports/plan-3-<slug>.md` | per-standard report (counts, raw test output, top-wins checklist, residue) |
| `docs/superpowers/guideline-to-tool-playbook.md` (modify, Task 30) | apply order extended; token-cost ratio recorded from Task 1 |

## Plan-3 conventions (used by every standard task)

**Slugs and migration timestamps.** Task N (01–29) owns the timestamp minute `202609171{NN}`: seed `202609171NN00`, field configs `202609171NN10`, equations `202609171NN20` (e.g. Task 03 A-262E: `20260917100300_regulation_tables_seed_a262e.sql`, `20260917100310_field_configs_a262e.sql`, `20260917100320_equations_a262e.sql`). Rollback: `scripts/rollback-<ts>-<name-with-dashes>.sql`. Slugs: `a138`, `din1989_1`, `a262e`, `m277e`, `m1200_1`, `m1200_3`, `fll_gar`, `fll_naturteich`, `m820_3`, `din18130_1`, `m205`, `m187`, `din276`, `a178`, `din16941_2`, `m1200_2`, `din1989_2`, `m820_1`, `m820_2`, `iso5667_10`, `iso59020`, `iso46001`, `iso5667_6`, `vsme`, `din14021`, `iso14046`, `atv_a704e`, `iso5667_1`, `iso59004`.

**`table_code`.** The guideline's own table label, upper-case, without spaces: `TAB3`, `TAB7`, `TABA1` (Tab. A.1), `TABD1`, `TABLE16` for English editions, `BILD3` for a layer table printed as a figure, `S5_1_3_1` for a per-clause text table the guideline prints as prose bullets (rare; only when the inventory §1 lists it as a lookup and the prose gives one value per class). `standard_code` = prod `standards.code`; `edition` = the edition string printed on the transcript's title page, lifted (A138 keeps `'2024-10'`).

**Row keys.** `keys` values are stable snake_case tokens chosen by the executor (they are identifiers, not values); `label_de` and `verbatim_quote` are lifted. Composite keys in `key_columns` order; `row_key` = `rowKeyFor(keys, key_columns)`. Numeric bands printed as thresholds ("≤ 800 m²", "≥ 30 cm") become a key column with tokens (`le800`/`gt800`, `thin`/`thick`) and are driven either by a `select_one` field (when the engineer knows the band) or by an `if()` inside the equation string (`lookup('TAB8', schutzkategorie, if(A_C <= 800, 'le800', 'gt800'), 'n_max')` — string literals are valid lookup keys). `value_columns` names are the executor's; types `number | string | enum | boolean`, `unit` lifted.

**Field-config entry (Task 0 type):**
```ts
export type FieldConfigEntry = {
  standard: string; worksheet: string; symbol: string;
  widget: Widget;                                  // from field-config.ts WIDGETS
  ui_config?: RegisterUiConfig | SelectManyUiConfig | Record<string, unknown> | null;
  lookup?: LookupBinding | null;                  // lookup_fill only
  visible_when?: string | null;
  enum_values?: Array<{ value: string; label_de: string; order_index: number }> | 'keep_prod';  // 'keep_prod' = D-1
  verification_quote: string;                      // the §7 cue sentence, lifted, with transcript line
  create?: { section_code: string | null; label_de: string; data_type: 'json' | 'enum' | 'number' | 'text' | 'boolean'; unit?: string | null; clause_reference: string; description: string /* starts 'Plan 3:' */ };
  // `create` = ADDITIVE new field (register carrier, missing select_one driver, lookup_fill limit target). Emitted as INSERT … WHERE NOT EXISTS;
  // is_required=false, verification_status='imported_unverified', order_index = max(order_index)+1 of the worksheet. Retiring the scalars it replaces is STAGED.
};
export type SectionVisibilityEntry = { standard: string; worksheet: string; section_code: string; visible_when: string; verification_quote: string };
export type EquationEntry = {
  standard: string; worksheet: string; equation_number: string;  // printed "Gl. 4" | "Eq. (2)" | "<WS>-D<n>" for text-only derivations
  formula: string;                                                // 'out = expr' in the Plan-2a language
  input_symbols: string[]; output_symbol: string; output_unit?: string | null;
  clause_reference: string; description: string;                  // description starts with 'Plan 3:' (rollback selector)
  verification_quote: string | null;                              // printed formula/sentence lifted, or null ⇒ sign-off entry
};
```
`emit-field-configs-sql.ts` refuses an entry whose `parseFieldConfig` fails, whose `visible_when` does not `parseCondition`, whose `enum_values` is a list while `<slug>.prior.json` shows non-null prod `enum_values` for that (standard, worksheet, symbol) (D-1), or whose symbol carries non-empty `consumer_worksheets` in `prior.json` while `visible_when` is set (importer rule from Plan 2a Task 10).

**`visible_when` strings.** Compliance DSL; driver must be a `select_one` (existing enum or one this task creates); form `driver == 'value'`, `driver IN {a, b}`, `driver != 'x'`, `a == 'x' AND b == 'y'`. An unset driver evaluates `pending` ⇒ visible (fail-safe, spec §6); add the `driver IS NOT NULL AND` guard only where the inventory §3 shows the field is meaningless before the choice, and say so in the entry's `verification_quote`. Whole-worksheet applicability = `visible_when` on every top-level section (`parent_section_id IS NULL`) of that worksheet, captured by `section_code` from prod (`worksheet_sections.code`; when `code IS NULL`, the executor records the section by `title_de` in the STAGED file and skips it — no migration keys on a title). A cross-worksheet driver must reach the target worksheet by inheritance: the executor checks the driver's `consumer_worksheets` in `prior.json`; when the target is missing, the `UPDATE fields SET consumer_worksheets = …` goes to the STAGED file (consumer edits are structural), and the `visible_when` is still emitted (it evaluates `pending` ⇒ visible until the consumer edit is ratified — fail-safe).

**Register conventions.** `ui_config.columns[]` per the Plan-1 zod contract (`key label type required options datalist unit min max placeholder width discriminator visible_when lookup expr`); `lookup_key` columns bind `{ table_code, group_by? }`, `lookup_value` columns bind `{ table_code, key_column, value }` (single key column — see Dependency notes for multi-key lookups, which use a `derived` column with `lookup('TAB', k1, k2, 'col')`); `derived` columns carry `expr`; `discriminator: true` on the row-type column; per-column `visible_when` references row columns. `override: { flag_key, applies_to, policy }` only when the table's `override_policy` is `anhaltswert | kann | messwert` (a `locked` table gets no override block). Aggregates are equations, never footer-only (`sum_column` is display; the symbol is produced by `sum_rows`). Per-row limits are `derived` boolean columns (`expr: 'value <= lookup(...)'`) and the worksheet-level verdict is `count_rows(reg, ok == false) == 0` or `count_rows(reg, ok == false)` as an equation feeding a gate (gate change → STAGED).

**Equation conventions.** Formula string `out = …` using only `if lookup sum_rows count_rows max_rows min_rows mean_rows stdev_rows last_rows contains cell flag ln log10 sqrt exp abs min max ^` (the Plan-2a set, `src/lib/expr/functions.ts`). `input_symbols` lists every free symbol (registers included). A NEW equation for a derivation the guideline describes in text ships `imported_unverified` with the sentence lifted into `verification_quote`. A REPLACEMENT of an existing equation row (same output symbol, different math or inputs) is a ruling: it is written into the STAGED file as `UPDATE equations … WHERE id = '<uuid captured from prod>'` with ☐ RATIFIED, never into the emitted migration; the migration's `ON CONFLICT DO NOTHING` guarantees nothing existing is touched. Two existing equations with the same `output_symbol` (DIN-1989-1 Gl. 2/3, A-178 Gl. 5/6/7, DIN-18130-1 Gl. 8/9, A-262E Gl. 6/8) are resolved by ONE new switching equation `out = if(driver == 'a', <expr a>, <expr b>)` under a NEW output symbol only when the guideline's own text names the switch; otherwise sign-off. Formula strings never contain numbers except structural constants that the guideline prints inside the formula itself (e.g. `× 100`, `/ 365`, `× 0,06`) — those are lifted into `verification_quote`.

**`lookup_fill` conventions.** Field `widget: 'lookup_fill'`, `lookup: { table_code, edition?, role: 'value' | 'limit', keys: [{ column, from_symbol }], value }`. Role `value` when the filled number feeds an equation; role `limit` when it feeds a gate (`measured <= limit_symbol`) — the gate text change is STAGED. The field keeps its prod symbol when one exists (e.g. `ac_as_ratio_limit`, `f_methode`, `e`, `P_d`); a new limit field gets symbol `<measured>_limit`, `data_type number`, created additively through `create`. Executors prefer re-keying an existing number field (the inventories name them) over creating one.

**New fields (additive only).** The approved design (§4, §8 Phase 5) is the mandate to add register carriers and the selectors/limit targets the inventories list as "missing selector"/"NO required-value fields" — SR-4: additive infra for an approved mandate. Allowed via `create`: (a) a `json` register carrier, (b) an `enum` `select_one` driver with `enum_values` lifted from the printed list, (c) a `number` `lookup_fill` target, (d) a `boolean` attestation the inventory names. NOT allowed here (STAGED ☐ RATIFIED): deactivating or renaming the scalar fields a register replaces, changing `is_required`, `data_type`, `consumer_worksheets`, any gate, any existing equation. A created field lands in the section the inventory names (`section_code`, or `NULL` → the worksheet's first section; the executor records the choice) after the section's last field, `active = true`, `is_required = false`, `verification_status = 'imported_unverified'`, `description` starting `Plan 3:`, `verification_quote` = the lifted cue sentence.

**Verification vocabulary.** Tables: `md_verified` (all rows lifted) / `imported_unverified` (any synthesised or partial). Fields/equations touched by this plan: `imported_unverified` unless the row already is `verified_against_standard` (never downgraded). Quotes: ≤ ~700 chars, transcript line cited as `(L1234)` or `(printed p.N)` when page markers exist.

**Report and token measurement.** Each task report records: tokens in (the subagent's context total at end, from the transcript's usage line), sections/tables/rows/registers/conditionals/equations out, minutes. Task 1 (A138) is the measurement standard the playbook asks for; Task 30 writes the ratio into the playbook.

## Dependency notes — Plan 2a/2b interfaces this plan relies on, and where they fall short

- **Used as-is:** `parseFieldConfig` / `RegisterColumn` / `LookupBinding` (Plan 1 T2, `src/lib/eval/field-config.ts`); `RegulationTable` / `lookupRow` / `rowKeyFor` (Plan 1 T3); `a138SeedTables` builder pattern (Plan 1 T4); `emitSeedSql` (Plan 1 T5); `prepareRegisterRows` semantics — completeness = required columns non-null + `min`/`max`, `lookup_value` refill from the table when null and not overridden, `derived` via `evalValue` (Plan 2a T5); `resolveRegisterConfig` (DB wins while `widget = 'register'`); `makeTableLookup(standardCode)` (registry → seed builders → undefined) — **every new seed builder must be added to the fallback map in `src/lib/eval/regulation-tables-fallback.ts`** (Task 0 makes that map slug-driven); formula strings on `equations` rows evaluated by `evaluateFormula` with `registers`/`tableLookup` (Plan 2a T6); `computeVisibility` for fields and sections (Plan 2a T10); `not_applicable` gates (T11).
- **Gap G-1 — single-key `lookup_value` columns.** `columnLookup` has one `key_column`; a per-row lookup keyed by two or more row columns (A-262E Tables 3–16 by filter × size × sewer; M-1200-3 Tab. 7/8/9 by sprinkler × class × Spritzschutz; FLL-GAR Tab. 22 by Fügeverfahren × Material and Tab. 8 by Bauteil × Ausführung; DIN-1989-1 Tab. 2 by Aufstellung × Volumen/Domhöhe) is encoded as a `derived` column `expr: "lookup('TAB', k1, k2, 'col')"` — correct value, but no `override` sidecar and no "abweichend" flag for that cell. Tasks mark such columns `// G-1` and the override (when the table's policy allows one) goes to the sign-off sheet as a Plan-2b follow-up (`columnLookup.keys: string[]`).
- **Gap G-2 — no fixed-row (catalogue) register.** Spec §4 "catalogue with per-item rating" (M-820-3 174 QE items, ISO-59020 Table 3 indicators, ISO-59004 six principles, DIN-14021 6.5.3 a)–g), M-820-2 Anhang A/B outlines) needs rows seeded from a table with the rating column editable. `RegisterUiConfig` has no `seed_from_table`. This plan encodes each catalogue as a `regulation_table` (rows = printed items, verbatim) plus a register whose first column is a `lookup_key` on that table and a completeness equation `count_rows(reg) == <count_rows of table>` (the printed count is lifted as a table-level fact, checked by `count_rows`, never typed into the formula: `items_total = count_rows(qe_a1_items)` is a register count; the table row count itself is asserted in the pin test). Plan 2b follow-up: `ui_config.seed_from_table` (sign-off F-2).
- **Gap G-3 — no `median_rows` / `percentile_rows`.** M-1200-2 P50 (`perzentil_50_log10 = median`), M-205 percentile compliance (Tabelle 1/2 "(95)" columns), ISO-5667-1 n from σ are only partly expressible: P10 as `mean_rows − 1.282·stdev_rows` is what Gl. C.2-1 prints (allowed); the median and the "x % of samples ≤ limit" rule become `count_rows(reg, v <= limit) / count_rows(reg) >= p/100` (expressible) — the true median is a sign-off (function gap F-3).
- **Gap G-4 — `stdev_rows` is sample (n−1) by Plan-2a default (D-4).** DIN-18130-1, M-1200-2 SD and M-820-1 S-Abw tasks must quote the transcript's own definition; a population wording ⇒ sign-off, not a silent switch.
- **Gap G-5 — no date arithmetic / string aggregates.** `min_rows/max_rows` over `date` columns (M-820-2 Gewährleistungskalender earliest start / latest end, M-1200-3 Tagebuch date spans) are not computable; those aggregates stay display-only in the editor and are listed as F-5 follow-ups.
- **Gap G-6 — equations output numbers only** (`evalNumber` throws "Nicht-endliches Ergebnis" on a string). Class chains whose intermediate is a class TOKEN (A138 Tab. 5 → tier; M-1200-1 Tab. 7 → class; DIN-18130-1 Tab. 1 k → Bereich; FLL-GAR Tab. 18 h → W-class) cannot be a `derived` equation; they become a `lookup_fill` field with a string `value_columns` type (renderer shows the token's `label_de`) keyed on the `select_one`, or — when the key is a measured number (band) — an `if()`-chain equation returning a numeric band code with a companion string table for the label (`ac_band_code = if(A_C <= 800, 1, 2)`). Tasks say which.
- **Gap G-7 — `emit-selection-configs-sql.ts` cannot emit Plan-3 configs** (it reads `SELECTION_CONFIGS` and `ColumnDef` with four column types, no `lookup`, no `visible_when`, no `select_one`, no `lookup_fill`, no sections). Task 0 adds `emit-field-configs-sql.ts` (SR-4: infra for an approved mandate) reusing its `q()`/`j()` helpers and its D-1/I-1 `priorEnumValues` guard verbatim. The nine `20260911120000_selection_configs_*.sql` files stay untouched.
- **Gap G-8 — `ui_config.flags` not in the zod contract** (Plan 2a T5 note: "Plan 2b adds"). Registers that need a register-level "keine Zeilen zutreffend" flag (FLL-GAR Durchdringungen, VSME B01.100 subsidiaries when not consolidated) use `registerFlagKeys()`'s TS map until 2b lands; the tasks list them.
- **Gap G-9 — `lookup_fill` keyed on an engine output** depends on the renderer reading engine values (Plan 2b); until confirmed, every `lookup_fill` in this plan is keyed on stored fields (`select_one`, number) only, and band selection on derived values happens inside equation strings (G-6).
- **Gap G-12 — `lookup_fill.keys[].from_symbol` must be a symbol; a constant key (one parameter of a multi-parameter table) cannot be given as a literal.** Tables that would need a literal second key are split into one single-key table per parameter (`TABLE1_CSB`, `TABLE1_BSB5`, …; `TABD1_ECOLI`, …), each row carrying the full printed row in `verbatim_quote` so the verifier still matches. Hit by A-262E Table 1/2, M-277E Table 4, M-1200-1 Tab. 8, M-1200-3 Tab. 11/14, FLL-Naturteich Tables 7/8, DIN-EN-16941-2 D.1/D.2, M-820-1 VgV constants, DWA-A-178 text constants. Plan-2b follow-up: `keys[].literal`.
- **Gap G-13 — worksheet (non-row) symbols inside a register `derived` expr.** `prepareRegisterRows` builds its scope from `RegisterRowsCtx.symbol` (Plan 2a T5) — the executor of the first task that needs it (Task 3 `EZ`) confirms that the form/materialiser pass the worksheet symbol lookup into `RegisterRowsCtx`; if not, every such column moves up to a worksheet-level equation and the task notes it. Hit by A-262E, FLL-GAR, M-1200-3, DIN-18130-1, M-205, ISO-5667-10.
- **Gap G-14 — `lookup()`'s column argument is a string literal**; a column chosen by a condition is written as two lookups plus `if()`. Hit by M-1200-3 Tab. 3/11/13.
- **Gap G-15 — boolean keys.** `makeTableLookup` stringifies keys (`String(true)` = `"true"`); tables keyed by a boolean field seed their key tokens as `true`/`false`. Hit by DIN-18130-1 Tab. 4, M-820-1 §134 GWB, DIN-EN-16941-2 Sprüh, ISO-59020 boolean `lookup_value` comparisons.
- **Gap G-16 — only `count_rows` takes a condition; `mean_rows/stdev_rows/max_rows/min_rows` have no filter.** A filtered mean is `sum_rows(reg, if(c, v, 0)) / count_rows(reg, c)`; a filtered stdev is not expressible → one register per group (M-1200-2 per organism) or a sign-off.
- **Gap G-11 — no `ceil/floor/round` and no integer division** in the function set. Count rules such as A138 "≥ 1 test site per 150 m² Sohle, every 25 m" or A-262E "≥ 3 cells" become `count_rows(reg) >= <printed n>` only when the guideline prints n; a rounded quotient is a sign-off (F-11) with the formula text.
- **Gap G-10 — no `reference` column type inside a register** (a row cannot point at another register's row): M-1200-1 Flächenverzeichnis rows ↔ Schutzgut rows, DIN-276 Vergabeeinheit ↔ KG rows, M-820-2 Auflagen ↔ Genehmigungen are flattened (the referenced item becomes an `enum`/`text` column) and listed as Phase-6 follow-ups (F-10).
- **Cross-standard inheritance is Phase 6 (spec §8):** every "inherit from <other standard>" line in the inventories (DIN-1989-1 ↔ A138 roof rows, M-187 ↔ A-178, M-1200-x chain, ISO-5667 QA block, site water volumes) is recorded in the task's sign-off entry `X-<slug>` and NOT encoded here.

---

### Task 0: Plan-3 shared infrastructure (emitters, verifier, types, sign-off skeleton)

**Files:**
- Copy: `scripts/verification/prod-query.mjs` from `C:\Users\Ekowai\projects\ekowai-wizard\scripts\verification\prod-query.mjs` (byte-identical; it is not on this branch)
- Modify: `scripts/regulation-tables/emit-seed-sql.ts`, `src/lib/eval/regulation-tables-fallback.ts` (slug-driven builder map)
- Create: `scripts/regulation-tables/emit-field-configs-sql.ts`, `scripts/regulation-tables/emit-equations-sql.ts`, `scripts/regulation-tables/verify-regulation-tables.ts`, `src/lib/eval/field-configs/types.ts`, `src/lib/eval/field-configs/index.ts` (slug → module map), `src/lib/eval/equations/index.ts`, `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md`, `docs/superpowers/specs/2026-09-11-guideline-to-tool/reports/README.md`
- Test: `scripts/__tests__/emit-field-configs-sql.test.ts`, `scripts/__tests__/emit-equations-sql.test.ts`, `scripts/__tests__/verify-regulation-tables.test.ts`

**Interfaces:**
- Consumes: `emitSeedSql` (Plan 1 T5), `parseFieldConfig` (Plan 1 T2), `parseCondition` / `parseNumeric` (Plan 2a T1), `validateEngineEligibility` (Plan 2a T4), `q()`/`j()` helpers and the `touched()` D-1 guard from `emit-selection-configs-sql.ts`.
- Produces:
  ```ts
  // emit-seed-sql.ts
  export const SEED_BUILDERS: Record<string, { build: () => RegulationTable[]; ts: string }>;  // 'a138' → a138SeedTables/'20260911110000' (unchanged file names), then one entry per Plan-3 slug
  // CLI: tsx scripts/regulation-tables/emit-seed-sql.ts <slug>
  // emit-field-configs-sql.ts
  export function emitFieldConfigSql(slug: string, entries: FieldConfigEntry[], sections: SectionVisibilityEntry[], prior: PriorSnapshot): { up: string; down: string };
  export type PriorSnapshot = Record<string /* `${worksheet} ${symbol}` */, { enum_values: unknown; widget: string | null; ui_config: unknown; lookup: unknown; visible_when: string | null; consumer_worksheets: string[] | null }>
                            & { sections?: Record<string /* `${worksheet} ${section_code}` */, { visible_when: string | null }> };
  // CLI: tsx scripts/regulation-tables/emit-field-configs-sql.ts <slug>   (reads src/lib/eval/field-configs/<slug>.ts + <slug>.prior.json)
  // emit-equations-sql.ts
  export function emitEquationsSql(slug: string, entries: EquationEntry[]): { up: string; down: string };
  // verify-regulation-tables.ts
  export function verifyQuotes(tables: RegulationTable[], transcriptText: string): Array<{ table_code: string; row_key: string; ok: boolean }>;
  // CLI: tsx scripts/regulation-tables/verify-regulation-tables.ts <slug> "<transcript path>"
  ```

- [ ] **Step 1: Failing tests**

```ts
// scripts/__tests__/emit-field-configs-sql.test.ts
import { describe, it, expect } from 'vitest';
import { emitFieldConfigSql } from '../regulation-tables/emit-field-configs-sql';

const reg = { title: 'T', columns: [{ key: 'a', label: 'A', type: 'text' }] };
describe('emitFieldConfigSql', () => {
  it('one UPDATE per entry scoped to standard + worksheet + symbol; widget/ui_config/lookup/visible_when always written', () => {
    const { up } = emitFieldConfigSql('x', [
      { standard: 'S', worksheet: 'S-01', symbol: 'reg', widget: 'register', ui_config: reg, verification_quote: 'q (L1)' },
      { standard: 'S', worksheet: 'S-02', symbol: 'n', widget: 'scalar', visible_when: "mode == 'a'", verification_quote: 'q (L2)' },
    ], [], {});
    expect(up).toContain("SET widget = 'register', ui_config = ");
    expect(up).toContain("WHERE f.worksheet_template_id = w.id AND f.symbol = 'reg' AND w.code = 'S-01' AND s.code = 'S'");
    expect(up).toContain("visible_when = 'mode == ''a'''");
    expect((up.match(/UPDATE fields/g) ?? []).length).toBe(2);
  });
  it('D-1: enum_values is written only when prior is null; a list against a non-null prior throws', () => {
    const ev = [{ value: 'a', label_de: 'A', order_index: 0 }];
    const okPrior = { 'S-01 k': { enum_values: null, widget: null, ui_config: null, lookup: null, visible_when: null, consumer_worksheets: null } };
    expect(emitFieldConfigSql('x', [{ standard: 'S', worksheet: 'S-01', symbol: 'k', widget: 'select_one', enum_values: ev, verification_quote: 'q' }], [], okPrior).up).toContain('enum_values = ');
    const badPrior = { 'S-01 k': { ...okPrior['S-01 k'], enum_values: [{ value: 'z' }] } };
    expect(() => emitFieldConfigSql('x', [{ standard: 'S', worksheet: 'S-01', symbol: 'k', widget: 'select_one', enum_values: ev, verification_quote: 'q' }], [], badPrior)).toThrow(/D-1/);
    expect(emitFieldConfigSql('x', [{ standard: 'S', worksheet: 'S-01', symbol: 'k', widget: 'select_one', enum_values: 'keep_prod', verification_quote: 'q' }], [], badPrior).up).not.toContain('enum_values = ');
  });
  it('refuses visible_when on a produced symbol and an unparseable condition', () => {
    const prior = { 'S-01 A_C': { enum_values: null, widget: null, ui_config: null, lookup: null, visible_when: null, consumer_worksheets: ['S-02'] } };
    expect(() => emitFieldConfigSql('x', [{ standard: 'S', worksheet: 'S-01', symbol: 'A_C', widget: 'scalar', visible_when: 'y == 1', verification_quote: 'q' }], [], prior)).toThrow(/consumed by S-02/);
    expect(() => emitFieldConfigSql('x', [{ standard: 'S', worksheet: 'S-01', symbol: 'z', widget: 'scalar', visible_when: 'y ==', verification_quote: 'q' }], [], {})).toThrow(/visible_when/);
  });
  it('sections: UPDATE worksheet_sections keyed by worksheet code + section code; rollback restores prior', () => {
    const { up, down } = emitFieldConfigSql('x', [], [{ standard: 'S', worksheet: 'S-03', section_code: 'S-03.2', visible_when: "typ == 'b'", verification_quote: 'q' }], { sections: { 'S-03 S-03.2': { visible_when: null } } });
    expect(up).toContain("UPDATE worksheet_sections ws SET visible_when = 'typ == ''b'''");
    expect(up).toContain("ws.code = 'S-03.2'");
    expect(down).toContain('SET visible_when = NULL');
  });
  it('create: INSERT … WHERE NOT EXISTS with the Plan 3 description; rollback deletes only that row', () => {
    const { up, down } = emitFieldConfigSql('x', [{ standard: 'S', worksheet: 'S-05', symbol: 'sites', widget: 'register', ui_config: reg, verification_quote: 'q (L9)',
      create: { section_code: 'S-05.1', label_de: 'Versuchsstandorte', data_type: 'json', unit: null, clause_reference: '§5.3.3.6', description: 'Plan 3: k_f-Versuchsstandorte als Zeilen' } }], [], {});
    expect(up).toContain("INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, widget, ui_config, lookup, visible_when, enum_values, order_index, active)");
    expect(up).toContain("WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = 'sites')");
    expect(up).toContain("(SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id)");
    expect(down).toContain("DELETE FROM fields f USING worksheet_templates w, standards s WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'S' AND w.code = 'S-05' AND f.symbol = 'sites' AND f.description LIKE 'Plan 3:%'");
  });
  it('rollback restores each touched field to its prior four columns and prior enum_values', () => {
    const prior = { 'S-01 k': { enum_values: null, widget: null, ui_config: null, lookup: null, visible_when: null, consumer_worksheets: null } };
    const { down } = emitFieldConfigSql('x', [{ standard: 'S', worksheet: 'S-01', symbol: 'k', widget: 'select_one', enum_values: [{ value: 'a', label_de: 'A', order_index: 0 }], verification_quote: 'q' }], [], prior);
    expect(down).toContain('widget = NULL, ui_config = NULL, lookup = NULL, visible_when = NULL, enum_values = NULL');
  });
});
```

```ts
// scripts/__tests__/emit-equations-sql.test.ts
import { describe, it, expect } from 'vitest';
import { emitEquationsSql } from '../regulation-tables/emit-equations-sql';
describe('emitEquationsSql', () => {
  const e = { standard: 'S', worksheet: 'S-04', equation_number: 'S-04-D1', formula: 'BW_a = sum_rows(verbraucher, p_d * n) * 365', input_symbols: ['verbraucher'], output_symbol: 'BW_a', output_unit: 'l/a', clause_reference: '§16.3.7', description: 'Plan 3: Σ …', verification_quote: 'lifted (L905)' };
  it('inserts with worksheet resolved by code and never updates on conflict', () => {
    const { up, down } = emitEquationsSql('x', [e]);
    expect(up).toContain("INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)");
    expect(up).toContain("SELECT w.id, 'S-04-D1', 'BW_a = sum_rows(verbraucher, p_d * n) * 365', ARRAY['verbraucher']::text[]");
    expect(up).toContain("FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE w.code = 'S-04' AND s.code = 'S'");
    expect(up).toContain('ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING');
    expect(up).toContain("'imported_unverified'");
    expect(down).toContain("DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = 'S' AND w.code = 'S-04' AND e.equation_number = 'S-04-D1' AND e.description LIKE 'Plan 3:%'");
  });
  it('refuses a formula that does not parse or is not engine-eligible, and a description without the Plan 3 prefix', () => {
    expect(() => emitEquationsSql('x', [{ ...e, formula: 'BW_a = sum_rows(' }])).toThrow(/parse/);
    expect(() => emitEquationsSql('x', [{ ...e, formula: 'BW_a = SUM(verbraucher)' }])).toThrow(/eligib/);
    expect(() => emitEquationsSql('x', [{ ...e, description: 'x' }])).toThrow(/Plan 3:/);
  });
});
```

```ts
// scripts/__tests__/verify-regulation-tables.test.ts
import { describe, it, expect } from 'vitest';
import { verifyQuotes } from '../regulation-tables/verify-regulation-tables';
import { tab13AsTable } from '@/lib/eval/regulation-tables-seed-a138';
describe('verifyQuotes', () => {
  it('normalises whitespace and reports each row', () => {
    const t = tab13AsTable();
    const text = t.rows.map((r) => r.verbatim_quote.replace(/ /g, '\n')).join('\n');
    expect(verifyQuotes([t], text).every((r) => r.ok)).toBe(true);
    expect(verifyQuotes([t], 'nothing here').every((r) => !r.ok)).toBe(true);
  });
});
```

- [ ] **Step 2: Run → FAIL** (`pnpm vitest run --project unit scripts/__tests__/emit-field-configs-sql.test.ts scripts/__tests__/emit-equations-sql.test.ts scripts/__tests__/verify-regulation-tables.test.ts`)

- [ ] **Step 3: Implement**

`src/lib/eval/field-configs/types.ts` — the three types from the conventions section, verbatim. `src/lib/eval/field-configs/index.ts` — `export const FIELD_CONFIG_MODULES: Record<string, () => Promise<{ FIELD_CONFIGS: FieldConfigEntry[]; SECTION_VISIBILITY: SectionVisibilityEntry[] }>>` (slug → dynamic import; each standard task adds one line). Same shape for `src/lib/eval/equations/index.ts`.

`emit-seed-sql.ts` — keep `emitSeedSql` unchanged; replace the CLI tail:
```ts
export const SEED_BUILDERS: Record<string, { build: () => RegulationTable[]; ts: string; slugFile: string }> = {
  a138: { build: a138SeedTables, ts: '20260911110000', slugFile: 'a138' },   // Plan-1 file names preserved
  // Plan-3 tasks append one line each, e.g. din1989_1: { build: din19891SeedTables, ts: '20260917100200', slugFile: 'din1989_1' }
};
if (process.argv[1]?.endsWith('emit-seed-sql.ts')) {
  const slug = process.argv[2]; const b = SEED_BUILDERS[slug]; if (!b) throw new Error(`unknown seed slug ${slug}`);
  const { up, down } = emitSeedSql(b.build());
  writeFileSync(`scripts/migrations/${b.ts}_regulation_tables_seed_${b.slugFile}.sql`, up);
  writeFileSync(`scripts/rollback-${b.ts}-regulation-tables-seed-${b.slugFile.replace(/_/g, '-')}.sql`, down);
  console.log('wrote seed + rollback for', slug);
}
```
`src/lib/eval/regulation-tables-fallback.ts` — `seedTables()` iterates every `SEED_BUILDERS` entry's `build()` instead of `a138SeedTables()` alone (import the map from a pure module `src/lib/eval/regulation-tables-seed-index.ts` that both the script and the fallback read — the script file itself must stay Node-only).

`emit-field-configs-sql.ts`:
```ts
import { parseFieldConfig } from '../../src/lib/eval/field-config';
import { parseCondition, parseNumeric } from '../../src/lib/expr';
const q = (s: string) => `'${s.replace(/'/g, "''")}'`; const j = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
const where = (e: { standard: string; worksheet: string; symbol: string }) => `FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE f.worksheet_template_id = w.id AND f.symbol = ${q(e.symbol)} AND w.code = ${q(e.worksheet)} AND s.code = ${q(e.standard)}`;
export function emitFieldConfigSql(slug, entries, sections, prior) {
  const up = [`-- Generated by scripts/regulation-tables/emit-field-configs-sql.ts for ${slug} (Plan 3). Regenerate, do not hand-edit.`, 'BEGIN;'];
  const down = ['BEGIN;'];
  for (const e of entries) {
    parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null });   // throws FieldConfigError
    if (e.visible_when != null && !parseCondition(e.visible_when).ok) throw new Error(`${e.symbol}: visible_when does not parse`);
    if (e.widget === 'register') for (const c of (e.ui_config as RegisterUiConfig).columns) { if (c.expr && !parseNumeric(c.expr).ok) throw new Error(`${e.symbol}.${c.key}: expr does not parse`); if (c.visible_when && !parseCondition(c.visible_when).ok) throw new Error(`${e.symbol}.${c.key}: visible_when does not parse`); }
    const p = prior[`${e.worksheet} ${e.symbol}`];
    if (e.visible_when != null && p?.consumer_worksheets?.length) throw new Error(`${e.symbol}: visible_when on a symbol consumed by ${p.consumer_worksheets.join(', ')}`);
    if (e.create) {
      if (!e.create.description.startsWith('Plan 3:')) throw new Error(`${e.symbol}: create.description must start with 'Plan 3:'`);
      const section = e.create.section_code ? `(SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = ${q(e.create.section_code)})` : `(SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.parent_section_id IS NULL ORDER BY ws.order_index LIMIT 1)`;
      up.push(`INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, widget, ui_config, lookup, visible_when, enum_values, order_index, active)
SELECT w.id, ${section}, ${q(e.symbol)}, ${q(e.create.label_de)}, ${q(e.create.data_type)}, ${e.create.unit ? q(e.create.unit) : 'NULL'}, false, ${q(e.create.clause_reference)}, ${q(e.create.description)}, 'imported_unverified', ${q(e.verification_quote)}, ${q(e.widget)}, ${e.ui_config == null ? 'NULL' : j(e.ui_config)}, ${e.lookup == null ? 'NULL' : j(e.lookup)}, ${e.visible_when == null ? 'NULL' : q(e.visible_when)}, ${Array.isArray(e.enum_values) ? j(e.enum_values) : 'NULL'}, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE w.code = ${q(e.worksheet)} AND s.code = ${q(e.standard)}
AND NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = ${q(e.symbol)});`);
      down.push(`DELETE FROM fields f USING worksheet_templates w, standards s WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = ${q(e.standard)} AND w.code = ${q(e.worksheet)} AND f.symbol = ${q(e.symbol)} AND f.description LIKE 'Plan 3:%';`);
      continue;
    }
    const sets = [`widget = ${q(e.widget)}`, `ui_config = ${e.ui_config == null ? 'NULL' : j(e.ui_config)}`, `lookup = ${e.lookup == null ? 'NULL' : j(e.lookup)}`, `visible_when = ${e.visible_when == null ? 'NULL' : q(e.visible_when)}`];
    if (Array.isArray(e.enum_values)) { if (p?.enum_values != null) throw new Error(`${e.symbol}: D-1 — prod enum_values is non-null; use 'keep_prod' and file a sign-off entry`); sets.push(`enum_values = ${j(e.enum_values)}`); }
    up.push(`UPDATE fields f SET ${sets.join(', ')} ${where(e)};`);
    const restore = [`widget = ${p?.widget ? q(p.widget) : 'NULL'}`, `ui_config = ${p?.ui_config != null ? j(p.ui_config) : 'NULL'}`, `lookup = ${p?.lookup != null ? j(p.lookup) : 'NULL'}`, `visible_when = ${p?.visible_when ? q(p.visible_when) : 'NULL'}`];
    if (Array.isArray(e.enum_values)) restore.push(`enum_values = ${p?.enum_values != null ? j(p.enum_values) : 'NULL'}`);
    down.push(`UPDATE fields f SET ${restore.join(', ')} ${where(e)};`);
  }
  for (const s of sections) {
    if (!parseCondition(s.visible_when).ok) throw new Error(`${s.section_code}: visible_when does not parse`);
    up.push(`UPDATE worksheet_sections ws SET visible_when = ${q(s.visible_when)} FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE ws.worksheet_template_id = w.id AND ws.code = ${q(s.section_code)} AND w.code = ${q(s.worksheet)} AND s.code = ${q(s.standard)};`);
    const ps = prior.sections?.[`${s.worksheet} ${s.section_code}`];
    down.push(`UPDATE worksheet_sections ws SET visible_when = ${ps?.visible_when ? q(ps.visible_when) : 'NULL'} FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE ws.worksheet_template_id = w.id AND ws.code = ${q(s.section_code)} AND w.code = ${q(s.worksheet)} AND s.code = ${q(s.standard)};`);
  }
  up.push('COMMIT;'); down.push('COMMIT;');
  return { up: up.join('\n') + '\n', down: down.join('\n') + '\n' };
}
```
CLI: `tsx scripts/regulation-tables/emit-field-configs-sql.ts <slug> <ts>` reads `src/lib/eval/field-configs/<slug>.ts` and `src/lib/eval/field-configs/<slug>.prior.json`, writes `scripts/migrations/<ts>_field_configs_<slug>.sql` + `scripts/rollback-<ts>-field-configs-<slug-dashed>.sql`. The `prior.json` is produced in-session by `node scripts/verification/prod-query.mjs --sql "select w.code as worksheet, f.symbol, f.enum_values, f.widget, f.ui_config, f.lookup, f.visible_when, f.consumer_worksheets from fields f join worksheet_templates w on w.id=f.worksheet_template_id join standards s on s.id=w.standard_id where s.code='<CODE>' and f.active"` (plus the sections query) and saved by the executor — read-only capture; if prod is unreachable the executor writes `prior.json` from the harness seed (`tests/harness/seed-<slug>.ts`) and marks the migration header `-- PRIOR FROM HARNESS SEED (prod unreachable <date>): owner re-captures before applying`.

`emit-equations-sql.ts`:
```ts
export function emitEquationsSql(slug, entries) {
  const up = [`-- Generated by scripts/regulation-tables/emit-equations-sql.ts for ${slug} (Plan 3). New rows only; existing equations are never updated here (rulings live in scripts/verification/${slug}-STAGED-plan3-rulings.sql).`, 'BEGIN;'];
  const down = ['BEGIN;'];
  for (const e of entries) {
    if (!e.description.startsWith('Plan 3:')) throw new Error(`${e.equation_number}: description must start with 'Plan 3:' (rollback selector)`);
    const rhs = e.formula.replace(/^[^=]+=\s*/, ''); if (!parseNumeric(rhs).ok) throw new Error(`${e.equation_number}: formula does not parse`);
    const el = validateEngineEligibility(e.formula, e.input_symbols, new Set(e.input_symbols)); if (!el.verified) throw new Error(`${e.equation_number}: not engine-eligible: ${el.reason}`);
    up.push(`INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)
SELECT w.id, ${q(e.equation_number)}, ${q(e.formula)}, ARRAY[${e.input_symbols.map(q).join(',')}]::text[], ${q(e.output_symbol)}, ${e.output_unit ? q(e.output_unit) : 'NULL'}, ${q(e.clause_reference)}, ${q(e.description)}, 'imported_unverified', ${e.verification_quote ? q(e.verification_quote) : 'NULL'}
FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id WHERE w.code = ${q(e.worksheet)} AND s.code = ${q(e.standard)}
ON CONFLICT (worksheet_template_id, equation_number) DO NOTHING;`);
    down.push(`DELETE FROM equations e USING worksheet_templates w, standards s WHERE e.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = ${q(e.standard)} AND w.code = ${q(e.worksheet)} AND e.equation_number = ${q(e.equation_number)} AND e.description LIKE 'Plan 3:%';`);
  }
  up.push('COMMIT;'); down.push('COMMIT;'); return { up: up.join('\n') + '\n', down: down.join('\n') + '\n' };
}
```

`verify-regulation-tables.ts`: `norm = (s) => s.replace(/\s+/g, ' ').trim()`; `verifyQuotes` returns `{ table_code, row_key, ok: normText.includes(norm(row.verbatim_quote)) }`; CLI prints one line per row and exits 1 when any row fails (the executor pastes the output; a FAIL row means the quote is not verbatim — fix or move to sign-off).

`SIGN-OFF-plan-3.md` skeleton:
```md
# Sign-off sheet — Plan 3 (encode the 29 standards)
Entry format (one block per item, appended by each standard task, never edited by another task):
### <ID> · <STANDARD> · <worksheet> · <symbol|table_code>
- Class: gate-guard | equation-replacement | data_type | deactivation | consumer-edit | multi-select-driver | range-SR-2 | text-only-formula | unreadable-cell | override-policy | interface-gap | cross-standard
- Chosen now (fail-safe): …
- Evidence (verbatim, transcript line): "…" (L…)
- Proposed SQL / config: (or reference to the STAGED file block)
- ☐ RATIFIED ☐ REJECTED ☐ DEFER
```
IDs: `<slug>-<class-letter>-<n>` (e.g. `a262e-G-3` gate guard #3). `reports/README.md`: the counts table header every report copies (tables / rows lifted / rows unreadable / registers / select_one / select_many / lookup_fill / field visible_when / section visible_when / equations new / equations staged / sign-off entries / tokens in / minutes).

- [ ] **Step 4: Run → PASS**: `pnpm vitest run --project unit scripts/__tests__ && pnpm -s typecheck && pnpm test` (raw output in the Task-0 report). Re-emit A138's seed via `pnpm -s tsx scripts/regulation-tables/emit-seed-sql.ts a138` and `git diff --stat scripts/migrations/20260911110000_regulation_tables_seed_a138.sql` must be empty (CLI refactor changed nothing).

- [ ] **Step 5: Commit**

```bash
git add scripts/verification/prod-query.mjs scripts/regulation-tables/ src/lib/eval/field-configs/ src/lib/eval/equations/ src/lib/eval/regulation-tables-fallback.ts src/lib/eval/regulation-tables-seed-index.ts scripts/__tests__/ docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md docs/superpowers/specs/2026-09-11-guideline-to-tool/reports/README.md
git commit -m "feat(plan-3): field-config + equation emitters, transcript quote verifier, slug-driven seed builders, sign-off skeleton"
```

---
## Execution order

Spec §10 first (its 10 items name 12 standards — 5 and 10 are pairs), then the remaining 17 ranked by the size of the inventory's §5 wins (fields de-duplicated + gates repaired + typed numbers removed), with the txt-only and transcript-less standards last because their tables cannot be seeded under Global Constraint 1:

| Task | Standard | Why here |
|---|---|---|
| 1 | DWA-A-138-1 | §10.1 — reference implementation; the token-cost measurement standard |
| 2 | DIN-1989-1 | §10.2 |
| 3 | DWA-A-262E | §10.3 |
| 4 | DWA-M-277E | §10.4 |
| 5 | DWA-M-1200-1 | §10.5 (first of the pair) |
| 6 | DWA-M-1200-3 | §10.5 (second of the pair; inherits class from Task 5) |
| 7 | FLL-GAR-2023 | §10.6 |
| 8 | FLL-Naturteich | §10.7 |
| 9 | DWA-M-820-3 | §10.8 |
| 10 | DIN-18130-1 | §10.9 |
| 11 | DWA-M-205 | §10.10 (first of the pair) |
| 12 | DWA-M-187 | §10.10 (second of the pair) |
| 13 | DIN-276 | largest re-typed block in the corpus (~90 stage EUR fields, 250 KG rows without quantity) |
| 14 | DWA-A-178 | Teilflächen Σ, `system_type` switch, 3 same-output equations, 13 equations |
| 15 | DIN-EN-16941-2 | source/demand rows, informative ranges hard-limited today (data-quality) |
| 16 | DWA-M-1200-2 | 16-pair validation rows, class-driven targets, stage chain |
| 17 | DIN-1989-2 | Filtertyp gating of 4 mis-firing gates, test-step rows |
| 18 | DWA-M-820-1 | Schwellenwert chain, three open registers |
| 19 | DWA-M-820-2 | Testbetrieb/Abnahme gate pair, five open registers |
| 20 | ISO-5667-10 | schedule generation, composite-mode switch (txt) |
| 21 | ISO-59020 | per-flow X rows — the whole method (txt) |
| 22 | ISO-46001 | water-balance register (txt, raw) |
| 23 | ISO-5667-6 | sampling-point rows (txt, Spanish) |
| 24 | VSME | Comprehensive-module gating, sites register, 8 missing roll-ups (no transcript) |
| 25 | DIN-14021 | claim-type gating of 18 greedy blocks (md) |
| 26 | ISO-14046 | flow/impact registers (md, Spanish) |
| 27 | ATV-A-704E | determination rows (no transcript) |
| 28 | ISO-5667-1 | K lookup pending PDF quote (no transcript) |
| 29 | ISO-59004 | principles checklist, actions register (no transcript) |

---

### Task 1: DWA-A-138-1 — Tab. 5 → tier → Tab. 6/7 limits, Tab. 3 feasibility, Tab. 11 method, Tab. 8 Schutzkategorie, k_f sites, flood surfaces from the inventory rows

**Inputs:** inventory `docs/superpowers/specs/2026-09-11-guideline-to-tool/inventory/DWA-A-138-1.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).md`; harness `tests/harness/a138-verify.integration.test.ts`, `tests/harness/seed-a138.ts`, `tests/harness/_harness-env-a138.ts`; prod capture via `prod-query.mjs` (`DWA-A-138-1`, 28 worksheets, 262 fields, 46 equations). Already on the mechanism (do NOT re-encode): `surface_inventory` (Plan 2b register), the six A138-07 `sum_rows` equations (Plan 2a T6), `soil_bodenart_tab13` / `a_s_m_provenance` `visible_when` (Plan 2a T10), TAB9/5/6/13 builders (Plan 1 T4), `ac_as_ratio_limit` (Plan 2b — verify; if 2b left it, this task encodes it as equation E-4 below).

**Estimated size:** tables 4 upgraded + 5 new (TAB7, TAB8, TAB11, TAB14, S6_4_2_QVS; rows ≈ 4 + 8 + 6 + 7 + 2 — count the printed rows) / registers 2 new (`kf_test_sites`, `soil_layers`) / select_one 2 new (`schutzkategorie`, `schuettmaterial`) / lookup_fill 4 / field `visible_when` 6 / section `visible_when` 7 worksheets (A138-16…22) / equations 7 new + 2 staged / sign-off ≈ 14. Engineer time saved (inventory §5): "engineer types A_C, k_i, Q_S, V, r_D(n), D, n once — today up to 7×"; Tab. 5/6/7 limits and required η filled automatically; Tab. 11 `f_methode` filled; Schutzkategorie fills `n`; feasibility derived from the seven Tab. 3 criteria. **This is the measurement task:** record tokens in / artefacts out in the report (playbook "Token budget note").

**Files:** modify `src/lib/eval/regulation-tables-seed-a138.ts` (+ `src/lib/eval/__tests__/regulation-tables-seed-a138.test.ts`); create `src/lib/eval/field-configs/a138.ts`, `src/lib/eval/field-configs/a138.prior.json`, `src/lib/eval/equations/a138.ts`, `src/lib/eval/__tests__/field-configs-a138.test.ts`, `src/lib/eval/__tests__/equations-a138.test.ts`, `src/components/worksheet/__tests__/register-a138-kf-sites.test.tsx`, `scripts/verification/a138-STAGED-plan3-rulings.sql`, `docs/superpowers/specs/2026-09-11-guideline-to-tool/reports/plan-3-a138.md`; generated `scripts/migrations/20260917100100_regulation_tables_seed_a138.sql` (NEW timestamp — the Plan-1 file `20260911110000_…` stays as the pre-Plan-3 seed; this one supersedes it via `ON CONFLICT DO UPDATE` and its rollback re-emits the Plan-1 rows), `20260917100110_field_configs_a138.sql`, `20260917100120_equations_a138.sql` + three rollbacks.

- [ ] **Step 1: Read.** Inventory §1–§5 completely. Transcript lines L741–755 (Tab. 3), L791 (Tab. 5 deviation sentence), L800–866 (Tab. 5), L912–940 (Tab. 6), L944 (strictest rule), L980–1023 (Tab. 7), L1031, L1132–1196 (Tab. 8), L1248–1315 (Tab. 9), L1338–1340 + L1354 (test-site density and min rule), L1369–1373 (Tab. 10 image), L1381–1393 (Tab. 11), L1395 (BBZ k_f range), L1706–1713 (Tab. 13), L1869–1870 (q_VS), L2250–2269 (Tab. 14), L2444–2466 (Tab. A.1). Capture `a138.prior.json` (fields + sections, read-only).

- [ ] **Step 2: Tables** (`standard_code 'DWA-A-138-1'`, `edition '2024-10'`; builder `a138SeedTables()` returns all nine):

| table_code | key_columns | value_columns (type, unit) | override_policy (cue — quote the transcript sentence into `override_quote`) | rows / status |
|---|---|---|---|---|
| `TAB9` (upgrade) | `surface_type` | unchanged `cm cs kind group` | `anhaltswert` (Gl. 2 legend "zum Beispiel gemäß Tabelle 9") | replace every synthesised `verbatim_quote` with the printed row lifted from L1248–1315; **parity pin:** `values` must deep-equal `getTab9Entries()` — any difference ⇒ STOP, sign-off `a138-U-1`, keep the TS value; status stays `imported_unverified` until the owner rules I-2 (`a138-O-1`) |
| `TAB5` (upgrade) | `flaechengruppe` | `tier` (enum, unchanged) + new `bk` (enum I/II/III) | keep `locked` (spec: tier mappings) but quote L791 "kann in begründeten Fällen abgewichen werden" into `override_quote`; sign-off `a138-P-1` asks whether the printed sentence makes it `anhaltswert` | quotes lifted per Kurzzeichen row L800–866; `md_verified` |
| `TAB6` (upgrade) | `tier`, `bbz_band` (thin/thick tokens for the two printed thickness columns) | `max` (number) + new `n_m_max` (number, 1/a) | `locked` | quotes lifted L912–940; rows the transcript prints as "(*)" or "(keine Angabe)" are NOT seeded — sign-off `a138-U-3` (authority state); `md_verified` only if every seeded row is lifted |
| `TAB7` (new) | `tier` | `eta_afs63_min` (number, %), `eta_geloest_min` (number, %) | `locked` (limit rows; (**) Cu/Zn note into `override_quote`) | L980–1023; "(*)" rows not seeded → `a138-U-4` |
| `TAB8` (new) | `schutzkategorie` (gering/maessig/stark/sehr_stark), `ac_band` (le800/gt800) | `n_max` (number, 1/a), `t_n_min` (number, a, nullable), `ueberflutung_n` (number, 1/a) | `locked` (bounds "(≤ …)"; the caption "Hinweise zur Festlegung" → sign-off `a138-P-2`); footnote (a) → `a138-J-1` | L1132–1196 |
| `TAB11` (new) | `method` (6 tokens for the 6 printed rows) | `f_methode` (number) | `locked` (no override wording; Gl. 6 "f_K = f_Ort·f_Methode ≤ 1") | L1381–1393 |
| `TAB13` (upgrade) | `bodenart` | `factor` | `locked` | lift quotes L1706–1713; parity pin vs current `tab13AsTable()` values |
| `TAB14` (new) | `facility_type` (tokens = prod `facility_type_selected` enum values, D-1; the printed column ↔ token map written in the builder comment) | `kf_min` (number, m/s), `bbz_min_cm`, `einstau_min_cm`, `einstau_max_cm`, `freibord_min_cm`, `boeschung_max` (number, 1:m as m), `entleerung_max_h` — every cell nullable ("–") | `anhaltswert` ("i. d. R.") | L2250–2269 |
| `S6_4_2_QVS` (new) | `schuettmaterial` (kiessand/kies) | `q_vs` (number, l/(s·m)) | `messwert` ("Liegen keine Herstellerangaben … vor, können folgende Werte näherungsweise …") | L1869–1870 |

Not seedable: Tab. 10 (image, L1373) → `a138-U-2`; `f_ort` keeps its SR-2 range sentence (L1369) as `verification_quote`. Tab. A.1 is a suitability matrix, not a value table → not seeded (reference in `a138-X-1`). Pin test: every table's row count equals the printed row count the executor counted (assert the number in the test with the transcript line in a comment), keys unique, `verifyQuotes` PASS list pasted in the report.

- [ ] **Step 3: Selections / registers** (`src/lib/eval/field-configs/a138.ts`):

`belastungskategorie` (A138-06, existing enum, `enum_values` `'keep_prod'`) → `lookup_fill` (cue Tab. 5 row IS the mapping; §7 rule 5):
```json
{ "widget": "lookup_fill", "enum_values": "keep_prod",
  "lookup": { "table_code": "TAB5", "role": "value", "keys": [{ "column": "flaechengruppe", "from_symbol": "flaechengruppe" }], "value": "bk" } }
```
(the renderer shows the `bk` token's `label_de`; prod enum tokens I/II/III must equal the `bk` tokens — check in `prior.json`, mismatch ⇒ `a138-E-2`).

`a138_tier` (A138-06, **create**, `data_type text`, label lifted from Tab. 6 caption) → `lookup_fill` `{ table_code: 'TAB5', role: 'value', keys: [{ column: 'flaechengruppe', from_symbol: 'flaechengruppe' }], value: 'tier' }` — the string key the TAB6/TAB7 lookups need (G-6).

`eta_afs63_required`, `eta_geloest_required` (A138-06, **create**, `number`, unit `%`) → `lookup_fill` role `limit`, keys `[{ column: 'tier', from_symbol: 'a138_tier' }]`, values `eta_afs63_min` / `eta_geloest_min`; the gate `eta_AFS63 >= eta_afs63_required` is STAGED (`a138-G-1`, evidence Tab. 7 caption).

`schutzkategorie` (A138-08, **create**, `enum`, options = the 4 printed Tab. 8 rows, labels lifted) → `select_one`; `schuettmaterial` (A138-18, **create**, `enum`, 2 options lifted L1869–1870) → `select_one`; `q_VS` (A138-18, existing number) → `lookup_fill` `{ table_code: 'S6_4_2_QVS', role: 'value', keys: [{ column: 'schuettmaterial', from_symbol: 'schuettmaterial' }], value: 'q_vs' }` with `messwert` policy (provenance field = existing `datenquelle`-style field if one exists on A138-18, else sign-off `a138-S-1`).

`f_methode` (A138-03, existing number): `lookup_fill` on TAB11 needs a 6-value driver; prod `permeability_test_method` has 4 values (D-1) → do NOT emit; STAGED block proposes the 6-row enum + the config `{ table_code: 'TAB11', role: 'value', keys: [{ column: 'method', from_symbol: 'permeability_test_method' }], value: 'f_methode' }` (`a138-E-1`).

`kf_test_sites` (A138-05, **create** `json`, section = the k_f section) → `register`:
```json
{ "title": "k_f-Versuchsstandorte", "subtitle": "§5.3.3.6 — je Standort ein Versuch; maßgebend ist der minimale Wert", "add_label": "+ Standort", "placement": "section",
  "columns": [
    { "key": "label", "label": "Standort", "type": "text", "required": true },
    { "key": "method", "label": "Verfahren (Tab. 11)", "type": "lookup_key", "required": true, "lookup": { "table_code": "TAB11" } },
    { "key": "f_methode_row", "label": "f_Methode", "type": "lookup_value", "lookup": { "table_code": "TAB11", "key_column": "method", "value": "f_methode" } },
    { "key": "depth_m", "label": "Tiefe", "type": "number", "unit": "m", "min": 0 },
    { "key": "k_f_measured", "label": "k_f gemessen", "type": "number", "unit": "m/s", "required": true, "min": 0 },
    { "key": "date", "label": "Datum", "type": "date" }
  ] }
```
`soil_layers` (A138-05, **create** `json`) → `register` columns `label text`, `top_m number`, `bottom_m number`, `bodenart text` (datalist = the Tab. 13 `label_de` list read from the table, not typed), `k_f number m/s`, `is_bbz boolean`; footer note lifted L1039 ("die jeweils geringere Durchlässigkeit ist maßgebend").

Not encoded (Phase 6 / structural): N facility instances (`a138-X-2`), Flächengruppe per surface with strictest rule L944 (`a138-X-3`, needs a `flaechengruppe` column on `surface_inventory` — Plan 2b config change), Versickerrohr rows (fine as-is per inventory).

- [ ] **Step 4: Conditionals** (drivers are `select_one`; cross-worksheet drivers must be in `consumer_worksheets` — check `prior.json`, else STAGED consumer edit + entry `a138-C-n`):

| target | visible_when | cue (lift the sentence) |
|---|---|---|
| A138-21 fields `schacht_filter_thickness`, `k_f_FS`, `erf_k_f_FS` | `shaft_type == 'typ_B'` | §6.7.2 Typ B filter (inventory §3 row A138-21) |
| A138-20 `Q_Dr`, `V_MUE`, `Q_MUE` | `facility_type_selected == '<prod token for MRS>'` | Gl. 30–33 apply to MRS only |
| A138-19/-20 `n_M_Bemessung`, `n_R` | `facility_type_selected IN {<MRE token>, <MRS token>}` | L919–926 |
| A138-13 `f_Z` | *(none — REQ-15 already conditional)* | — |
| A138-12 `soil_bodenart_tab13`, `a_s_m_provenance` | *(Plan 2a T10 — do not repeat)* | — |
| sections: every top-level section of A138-16, -17, -18, -19, -20, -21, -22 | `facility_type_selected == '<that worksheet's type token>'` | §6.1 Bild 7 (image) + Tab. 14 columns; hidden ⇒ that type's gates `not_applicable` |

Gate guards (STAGED, one block each with the transcript quote): REQ-04 blocks at `gw_clearance < 1` where L777 requires Abstimmung, not prohibition (`a138-G-2` severity/wording); Gl. 40 switch for Typ B when `k_f > 1e-3` (L1031, `a138-G-3`); REQ-22 flood trigger unchanged.

- [ ] **Step 5: Derived** (`src/lib/eval/equations/a138.ts`; every `verification_quote` lifted):

| equation_number | worksheet | formula | input_symbols | clause | class |
|---|---|---|---|---|---|
| `A138-02-D1` | A138-02 | `feasibility_code = if(<col-2 conjunction over the seven criteria fields using their prod enum tokens and the printed thresholds gw_clearance >= 1, k_f >= 0.000001>, 1, if(<any col-4 criterion>, 3, 2))` — the executor writes the three criterion groups from L741–755 exactly as printed | the seven criteria symbols | §5.1.2 Tab. 3 | new (text rule printed as Tab. 3 col 2/3/4) → `imported_unverified`; `feasibility_determination` stays manual, its derivation from `feasibility_code` = `a138-D-1` |
| `A138-05-D1` | A138-05 | `k_f_sites_min = min_rows(kf_test_sites, k_f_measured)` | `kf_test_sites` | L1354 | new; feeding `k_f` = replacement of an input by a derived value → `a138-R-2` STAGED |
| `A138-05-D2` | A138-05 | `kf_test_sites_count = count_rows(kf_test_sites)` | `kf_test_sites` | L1338 | new; `kf_test_sites_count` is an existing number field → becomes derived (`a138-D-2`); density rule (150 m² / 25 m) → G-11 sign-off `a138-F-1` |
| `A138-05-D3` | A138-05 | `k_f_layer_min = min_rows(soil_layers, k_f)` | `soil_layers` | L1039 | new |
| `A138-06-D1` | A138-06 | `ac_as_ratio_limit = lookup('TAB6', a138_tier, if(bbz_thickness >= 30, 'thick', 'thin'), 'max')` — thresholds are the printed column heads (L912) | `a138_tier`, `bbz_thickness` | §5.2.3.2 Tab. 6 | ONLY if Plan 2b did not already bind it; `n_M_overflow_limit` likewise with `'n_m_max'` (`A138-06-D2`) |
| `A138-08-D1` | A138-08 | `n_limit = lookup('TAB8', schutzkategorie, if(A_C <= 800, 'le800', 'gt800'), 'n_max')` (800 printed in the column head L1132) | `schutzkategorie`, `A_C` | §5.3.3.4 Tab. 8 | new; the gate `n <= n_limit` replacing REQ-08's fixed set → `a138-G-4` STAGED |
| `A138-26-D1` | A138-26 | `A_C_s_flood = sum_rows(surface_inventory, if(kind == 'paved', area_m2 * c_s, 0))` | `surface_inventory` | Gl. 10 (L699) | new; rewriting the existing `V_Rueck` equation onto it = `a138-R-1` STAGED with the captured row |

Duplicates (inventory §4 list of ~40): NOT solved by equations — `a138-X-4` records the inheritance plan (`consumer_worksheets` on the single producer of each; STAGED consumer edits for `A_C_calculated`, `A_C_final`, `k_i_calculated`, `Q_S_*`, `V_VA_*`, `r_D_n_*`, `D_*`, `n_*`, `facility_type_*`).

- [ ] **Step 6: Emit + tests.** `pnpm -s tsx scripts/regulation-tables/emit-seed-sql.ts a138` (after adding `a138` → ts `20260917100100` as a second builder entry `a138_p3` so the Plan-1 file is untouched), `… emit-field-configs-sql.ts a138 20260917100110`, `… emit-equations-sql.ts a138 20260917100120`; `pnpm -s tsx scripts/regulation-tables/verify-regulation-tables.ts a138 "C:\Users\Ekowai\Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).md"`. Tests per the File map; the render test mounts `kf_test_sites` with two rows and asserts the `f_methode_row` cell fills when `method` changes and that `k_f_sites_min` evaluates through `evaluateFormula`.

- [ ] **Step 7: Verify + sign-off + report + commit.** `pnpm test && pnpm -s typecheck` (raw); `pnpm vitest run --project integration tests/harness/a138-verify.integration.test.ts`; walk inventory §5 wins 1–5 (1 → X-4 deferred; 2 encoded; 3 partially — TAB11 seeded, enum STAGED; 4 encoded via `n_limit`; 5 encoded as code); write the ≈14 sign-off entries; report with the token line; commit `feat(plan-3/a138): Tab. 5/6/7/8/11/14 seeds with lifted quotes, tier/limit lookups, k_f site rows, feasibility + n_limit equations (migrations written-not-applied)`.

---

### Task 2: DIN-1989-1 — Auffangflächen rows (Tab. 3 `e`), Verbraucher rows (Tab. 4) → one `BW_a`, Speicher (Tab. 2), Belastungsklasse (Tab. 1), Tab. 5 maintenance plan, Rückstau logic

**Inputs:** inventory `…/inventory/DIN-1989-1.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-1989-1\DIN-1989-1.md`; harness `tests/harness/din1989-1-verify.integration.test.ts`, `seed-din1989-1.ts`; prod: 6 worksheets, 60 fields, 4 equations, 14 requirements.

**Estimated size:** tables 5 (TAB1 ≈6 rows, TAB2 ≈4, TAB3 ≈7, TAB4 ≈6, TAB5 ≈17) / registers 4 (`auffangflaechen`, `verbraucher`, `bewaesserungsflaechen`, `speicher_behaelter`) + 1 checklist register (`wartungsplan`) / select_one 3 new drivers (`verbraucher_typ` inside the register, `bewaesserungs_typ` inside the register, `kanalart`) / lookup_fill 2 (`speicheroeffnung_dn_min`, `abdeckung_klasse`) / field `visible_when` 6 / section 0 / equations 6 new + 1 staged replacement (two `BW_a`) / sign-off ≈ 9. Time saved (§5): type each roof once with `e` filled; demand from typed rows instead of two same-output equations; `V_n`/Nennvolumen/Hybrid limit chain derived; Tab. 2 minimum opening filled; Rückstau allowed set.

**Files:** create `src/lib/eval/regulation-tables-seed-din1989_1.ts`, `field-configs/din1989_1.ts` + `.prior.json`, `equations/din1989_1.ts`, the three `__tests__` files, `register-din1989-1.test.tsx`, `scripts/verification/din1989_1-STAGED-plan3-rulings.sql`, report; generated `20260917100200_regulation_tables_seed_din1989_1.sql`, `20260917100210_field_configs_din1989_1.sql`, `20260917100220_equations_din1989_1.sql` + rollbacks.

- [ ] **Step 1: Read.** Inventory fully; transcript L362, L382, L420, L461–481 (Tab. 1), L490–499 (Tab. 2), L565–567, L591, L647–671, L783, L796–808, L834–847 (Tab. 3), L853, L877–911 (Tab. 4 + ANMERKUNG), L897–905, L934, L999–1067 (Tab. 5). Capture `prior.json`. Edition string from the title page.

- [ ] **Step 2: Tables** (`standard_code 'DIN-1989-1'`):

| table_code | key_columns | value_columns | override_policy (cue) | rows |
|---|---|---|---|---|
| `TAB3` | `auffangflaechen_art` (tokens = prod `auffangflaechen_art` enum values, D-1 — 7 values = 7 printed rows; mismatch ⇒ `din1989_1-E-1`) | `e` (number) | `anhaltswert` ("Als Planungsgrundlage … können die Werte nach Tabelle 3 verwendet werden"; footnote a "Abweichungen je nach Saugfähigkeit und Rauheit") | L834–847 |
| `TAB4_PERSON` | `verbraucher_typ` (toilette_haushalt / toilette_buero / toilette_schule) | `p_d` (number, l/(P·d)) | `anhaltswert` (footnote a "z.B. … Zweimengen-Spülsystemen"; §16.3.7 "anwendungsbezogen zu ermitteln" for gewerblich) | L877–895 — OCR "V" for "l" (verify each cell; unreadable ⇒ `din1989_1-U-1`); the Waschmaschine ANMERKUNG (+10 l) is a separate single-row table `TAB4_WASCHMASCHINE` key `zusatz`, value `p_d_zusatz` |
| `TAB4_FLAECHE` | `bewaesserungs_typ` (garten / sportanlage / gruenland_leicht / gruenland_schwer) | `bs_a_min` (number, l/m²), `bs_a_max` (number, l/m²) — ranges printed for Grünland; single values stored in both columns | `anhaltswert` + SR-2: Grünland rows are ranges → the register column is an engineer pick inside the range (`din1989_1-J-1`) | L877–895 |
| `TAB1` | `belastungsklasse` (tokens = prod enum 1–6, D-1) | `abdeckung_din_en_124` (string), `pruefkraft_kn` (number, nullable) | `locked` (Klasse 6 "nach Angabe des AG" → row seeded with null values + note) | L467–481 |
| `TAB2` | `aufstellung` (oberirdisch/unterirdisch), `groesse_band` (le3000 / gt3000 / dom_le450 / dom_gt450) | `oeffnung_min_mm` (number, mm) | `locked` ("dürfen … nicht unterschreiten") | L490–499 |
| `TAB5` | `anlagenteil` (one token per printed row) | `inspektion_intervall` (string, lifted), `wartung_intervall` (string, nullable) | `anhaltswert` ("Längere oder kürzere Zeitintervalle können sich … ergeben", L1067) | L999–1065; footnotes b/c/d for Hebeanlage → three rows or nullable + quote (`din1989_1-J-2`) |

- [ ] **Step 3: Registers / selections**

`auffangflaechen` (DIN-1989-1-04, **create** `json`) → `register`:
```json
{ "title": "Auffangflächen", "subtitle": "§16.3.4 Tab. 3 — je Fläche Art, A_A und e", "add_label": "+ Fläche",
  "columns": [
    { "key": "label", "label": "Bezeichnung", "type": "text" },
    { "key": "art", "label": "Art der Auffangfläche", "type": "lookup_key", "required": true, "lookup": { "table_code": "TAB3" } },
    { "key": "a_a", "label": "A_A", "type": "number", "unit": "m²", "required": true, "min": 0 },
    { "key": "e", "label": "e (Tab. 3)", "type": "lookup_value", "required": true, "lookup": { "table_code": "TAB3", "key_column": "art", "value": "e" } },
    { "key": "e_override", "label": "abweichend", "type": "boolean" },
    { "key": "a_e", "label": "A_A·e", "type": "derived", "expr": "a_a * e" }
  ],
  "override": { "flag_key": "e_override", "applies_to": ["e"], "policy": "anhaltswert" },
  "sum_column": { "key": "a_e", "label": "Σ A_A·e", "unit": "m²" } }
```
`verbraucher` (DIN-1989-1-04, **create**) → `register` columns: `label text`; `typ lookup_key TAB4_PERSON required`; `n number required min 0` (Personen); `p_d lookup_value {TAB4_PERSON, typ, p_d} required`; `waschmaschine boolean`; `p_d_eff derived expr "p_d + if(waschmaschine, lookup('TAB4_WASCHMASCHINE', 'waschmaschine', 'p_d_zusatz'), 0)"`; `bw_row derived expr "p_d_eff * n * 365"` (365 printed in Gl. 2 — lift); override block `anhaltswert` on `p_d`.
`bewaesserungsflaechen` (DIN-1989-1-04, **create**) → `register` columns: `label text`; `typ lookup_key TAB4_FLAECHE required`; `a_bew number m² required min 0`; `bs_a_min lookup_value {TAB4_FLAECHE, typ, bs_a_min}`; `bs_a_max lookup_value {…, bs_a_max}`; `bs_a number l/m² required` (engineer pick — SR-2; per-row check column `bs_in_range derived expr "bs_a >= bs_a_min AND bs_a <= bs_a_max"` — a condition node in a derived column evaluates via `evalValue`? `evalValue` is strict numeric; a boolean column expr must be a numeric `if(bs_a >= bs_a_min AND bs_a <= bs_a_max, 1, 0)` → `bs_in_range number`); `bw_row derived expr "a_bew * bs_a"`.
`speicher_behaelter` (DIN-1989-1-02, **create**) → `register` columns: `label text`; `werkstoff text`; `aufstellung enum options [oberirdisch, unterirdisch]` (tokens; labels lifted L490) `discriminator: true`; `einzelvolumen_l number required min 0`; `domhoehe_mm number visible_when "aufstellung == 'unterirdisch'"`; `groesse_band derived expr "if(aufstellung == 'oberirdisch', if(einzelvolumen_l <= 3000, 'le3000', 'gt3000'), if(domhoehe_mm <= 450, 'dom_le450', 'dom_gt450'))"` — G-6 note: derived string cells are allowed inside rows (`evalValue` returns `Value`); `oeffnung_min_mm derived expr "lookup('TAB2', aufstellung, groesse_band, 'oeffnung_min_mm')"` (G-1 two-key); `oeffnung_ist_mm number mm`; note L420 (in Reihe, Zu-/Überlauf im ersten, Entnahme im letzten). The thresholds 3000/450 are printed row heads (L490–499) — lifted into the config's `verification_quote`.
`wartungsplan` (DIN-1989-1-06, **create**) → G-2 catalogue register: `anlagenteil lookup_key TAB5 required`; `inspektion lookup_value {TAB5, anlagenteil, inspektion_intervall}`; `wartung lookup_value {…, wartung_intervall}`; `erledigt_am date`; `bemerkung text`; completeness equation below.
`kanalart` (DIN-1989-1-05, **create** `enum` options `mischwasser`/`regenwasser`, labels lifted L667) → `select_one`. `abdeckung_klasse` (DIN-1989-1-02, **create** text) → `lookup_fill` `{ TAB1, role value, keys [{ column 'belastungsklasse', from_symbol 'belastungsklasse' }], value 'abdeckung_din_en_124' }`.
Inbetriebnahme-Prüfpunkte (Anhang B, 15 rows) → `select_many` on a **created** `json` field `inbetriebnahme_pruefpunkte` with `enum_values` = the 15 printed items lifted (G-2 alternative for pure checklists: `select_many` with `contains()`), `ui_config { title, groups? }`.

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| `sicherungseinrichtung_typ` (-03) | `nachspeisung_medium == 'trinkwasser'` | L565 |
| `versickerung_bemessung_a138`, `whg_erlaubnis` (-05) | `ueberlauf_versickerung == '<prod true-token>'` (boolean driver — the DSL accepts `== true`) | L653–661 |
| `rueckstauschutz_art` (-05) | *(stay visible)*; STAGED gate `IF kanalart == 'mischwasser' THEN rueckstauschutz_art != 'rueckstauverschluss'` (`din1989_1-G-1`, L667–669) | — |
| `V_n`, `E_R`, `BW_a` inputs (-04) | `bemessungsverfahren != 'verkuerzt'` | L796–798; the verkürzt band sentence L808 goes into a created `attestation` `verkuerzt_band_beachtet` with the sentence as label (SR-2 range) |
| `belastungsklasse` (-02) | `speicher_aufstellung == 'unterirdisch'` | L461 |
| `hybridbehaelter_volumen` limit | equation below; gate STAGED `din1989_1-G-2` (L591 "sollte") |

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `DIN-1989-1-04-D1` | -04 | `sum_a_e = sum_rows(auffangflaechen, a_a * e)` | `auffangflaechen` | Gl. 1 (L849) — staged rewrite of the existing Gl. 1 `E_R` onto `sum_a_e` = `din1989_1-R-1` |
| `DIN-1989-1-04-D2` | -04 | `bw_person = sum_rows(verbraucher, p_d_eff * n * 365)` | `verbraucher` | Gl. 2 |
| `DIN-1989-1-04-D3` | -04 | `bw_flaeche = sum_rows(bewaesserungsflaechen, a_bew * bs_a)` | `bewaesserungsflaechen` | Gl. 3 |
| `DIN-1989-1-04-D4` | -04 | `bw_a_total = bw_person + bw_flaeche` | both | L897–905 "setzt sich zusammen aus" — the two existing same-output `BW_a` rows are the ruling `din1989_1-R-2` (retire both for this one, output symbol `BW_a`) |
| `DIN-1989-1-04-D5` | -04 | `tagesbedarf = bw_a_total / 365` | `bw_a_total` | L591 (Hybrid ≤ halber Tagesbedarf) |
| `DIN-1989-1-02-D1` | -02 | `nennvolumen = mindestwasservolumen + V_n` | both | L783 |
| `DIN-1989-1-02-D2` | -02 | `speicher_einzelvolumen_sum = sum_rows(speicher_behaelter, einzelvolumen_l)` | register | L420 |
| `DIN-1989-1-06-D1` | -06 | `wartungsplan_rows = count_rows(wartungsplan)` | register | Tab. 5 (G-2 completeness; the printed count is asserted in the seed pin) |

Cross-standard (`din1989_1-X-1`): `eta` ≡ DIN-1989-2 `eta_hydr`; roof rows shareable with A138-07; `h_N` external (reference).

- [ ] **Step 6: Emit + tests** (`din1989_1`, ts `20260917100200` / `…10` / `…20`); verifier run pasted. Render test: `auffangflaechen` two rows, `e` fills from `art`, Σ footer.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `din1989-1-verify.integration.test.ts`; §5 wins: 1 ✓, 2 ✓ (BW_a switch STAGED), 3 ✓ (verkürzt hides), 4 ✓ (Tab. 2 per row, Tab. 1 fill; CR-04 200-vs-600 = `din1989_1-G-3`), 5 partially (kanalart created, gate STAGED). Commit `feat(plan-3/din1989_1): …`.

---

### Task 3: DWA-A-262E — Table 1 pretreatment lookup, Tables 3–16 limits by (filter × size × sewer), sewer/size/season/greywater section visibility, Filterstufe register with discriminator, 4-of-5 samples, EZ/w_s_d inheritance

**Inputs:** inventory `…/inventory/DWA-A-262E.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-262E\DWA-A_262E (2).md` (English, LaTeX tables); harness `tests/harness/a262e-verify.integration.test.ts`, `seed-a262e.ts`; prod: 33 worksheets, 215 fields, 18 equations, 71 requirements. Vault `encoding-audit-2026-07-01/DEEP-DWA-A-262E.md` for structure only.

**Estimated size:** tables 6 (TABLE1 ≈6 rows, TABLE2 ≈6, TABLE_LIMITS ≈ one row per (filter × size × sewer) combination the executor counts from Tables 3–16 (≈20), TABLE15 ≈2 (by temperature band), TABLE16 ≈2, TABLE21 ≈5 readable rows) / registers 4 (`filterstufen`, `rieselrohre`, `ueberlaufbauwerke`, `ablaufproben`) / select_one 2 created (`hf_material`, `polishing_temp_band` — or derived from `effluent_temperature_C` in equations) / lookup_fill 3 (`B_CSB`, `B_BSB5`, `B_TKN` via `pretreatment_selected`) / field `visible_when` 5 / section `visible_when` on A262-05, -06, -25, -26, -28 and on the 13 filter-type worksheets (-11…-16, -19…-23) / equations 9 new (the seven described-but-unregistered + 2 register aggregates) + 3 staged (Gl. 6/8 switch, Gl. 11 clamp, Gl. 13/14 identical RHS) / sign-off ≈ 12. Time saved (§5): "removes ~60 duplicated fields and the four inconsistent filter-type enums" (collapse itself is Phase 6 — this task builds the register the collapse will use), Table 1 fill with `datenquelle_abwasser` override, EZ/w_s_d inherited, sewer gating, lining block.

**Files:** `regulation-tables-seed-a262e.ts`, `field-configs/a262e.ts` + prior, `equations/a262e.ts`, tests, `register-a262e-filterstufen.test.tsx`, STAGED file, report; migrations `20260917100300` / `…10` / `…20`.

- [ ] **Step 1: Read.** Inventory; transcript Table 1 (§4.1.2), Table 2 (§4.1.3), Tables 3–9 and 17 (§4.3/§4.4 small systems), Tables 10–14 and 18 (municipal), Table 15 (§4.3.6.1), Table 16 (§4.3.6.2), Table 21 (§5.4), §4.2.2 / §4.2.7 volume floors, §4.3.4 f_red clamp, §4.3.5 greywater 50 %, §4.3.3.6 overflow filter, §5.3 liner, §5.4.2.6 lava sand 8 %. Capture prior (note the three filter-type vocabularies: `filter_type`, `filter_type_KomKA`, `main_filter_type` — D-1 keeps all three; the register's discriminator uses `filter_type`'s tokens and the map to the other two is recorded in `a262e-E-1`).

- [ ] **Step 2: Tables** (`standard_code 'DWA-A-262E'`):

| table_code | key_columns | value_columns | policy (cue) | rows |
|---|---|---|---|---|
| `TABLE1` | `pretreatment` (tokens = prod `pretreatment_selected` values, D-1; the four printed columns map onto them — unmapped enum values get no row, `a262e-E-2`) × `parameter` (bsb5/csb/ts/tkn/gesn/pges) | `load_g_pd` (number, g/(P·d)), `note` (string: "(>12 °C)" cell) | `messwert` ("If there is no available data … the loads … given in Table 1 must be used") | §4.1.2 Table 1 (6 params × 4 columns) |
| `TABLE2` | `parameter` × `source` (median/average) | `load_g_pd` | `anhaltswert` ("gives informative specific loads") | §4.1.3 |
| `TABLE_LIMITS` | `filter_type` (prod tokens), `system_size` (small/municipal — prod `system_size_category` tokens), `sewer` (tr/m/any) | `a_fo_spez_min`, `a_fu_spez_min`, `a_fo_min_m2`, `f_a_f_csb_max`, `f_a_f_csb_betrieb_max`, `q_f_t_max`, `q_beschickung_min`, `h_beschickung_min`, `h_beschickung_max`, `t_sicker_min`, `t_sicker_max`, `f_v_csb_max`, `f_a_anf_csb_max`, `l_hf_min`, `l_rieselr_min_m_p`, `L_rieselr_max`, `b_rieselr_min`, `b_fgr_min`, `a_awf_spez_min`, `q_awf_max`, `orifice_area_max` — all number, nullable, units lifted per Table | `locked` (limits "≥/≤"; Table 15 footnote "*)" redox → `kann` NOTE in `override_quote`, sign-off `a262e-P-1`) | one row per printed (Table 3…14) column; sewer split rows for Tables 3/12/18 ("Tr"/"M"); Table 18 orifice row merged in; every cell lifted with its table number in `verbatim_quote` |
| `TABLE15` | `temp_band` (lt12/ge12) | `q_f_t_max`, `t_sicker_min` (+ the temperature-independent cells repeated) | `locked` + `kann` footnote | §4.3.6.1 |
| `TABLE16` | `material` (coarse_sand/gravel) | `f_a_anf_csb_max`, `f_a_fu_csb_max` | `locked` | §4.3.6.2 |
| `TABLE21` | `filter_type` | `grain_range` (string), `d10_min`, `d10_max`, `u_max`, `fines_max_pct`, `k_fa_approx` (string) | `anhaltswert` ("recommended filter media") | §5.4; the aerated-gravel row is truncated in the transcript → not seeded (`a262e-U-1`); Table 19 images (`a262e-U-2`) |

Volume floors of §4.2.2/§4.2.7 (300 l/P & 3000 l; 1.2 m³/P; ≥2 h & 75 l/P) → `S4_2_VORBEHANDLUNG` keyed `pretreatment`, values `v_min_l_p`, `v_min_l`, `hrt_min_h` (nullable) — `locked` ("must be at least").

- [ ] **Step 3: Registers / selections**

`B_CSB`, `B_BSB5`, `B_TKN` (A262-09, existing numbers) → `lookup_fill` role `value`, `{ table_code: 'TABLE1', keys: [{ column: 'pretreatment', from_symbol: 'pretreatment_selected' }, { column: 'parameter', from_symbol: ??? }] }` — the parameter is fixed per field, not a symbol: **G-12 (interface)**: `lookup.keys[].from_symbol` cannot be a literal. Encode instead three single-key tables `TABLE1_CSB`, `TABLE1_BSB5`, `TABLE1_TKN` (keys `pretreatment`, value `load_g_pd`), each row lifted (the executor splits Table 1 by parameter; `verbatim_quote` = the full printed row so the quote check still passes). Same split for `TABLE2`. `messwert` policy → provenance field = existing `datenquelle_abwasser`.
`pretreatment_selected` also drives `V_VB_min` (created number on A262-07) → `lookup_fill` `{ S4_2_VORBEHANDLUNG, role limit, keys pretreatment, value v_min_l_p }` with the gate STAGED (`a262e-G-1`).

`filterstufen` (A262-10, **create** `json`; the register the Phase-6 collapse will use — no worksheet is removed here) → `register`:
```json
{ "title": "Filterstufen", "subtitle": "§4.3 — je Filterstufe Typ, Fläche und Tabellengrenzwerte (Tab. 3–16, 17, 18)", "add_label": "+ Filterstufe",
  "columns": [
    { "key": "label", "label": "Stufe", "type": "text", "required": true },
    { "key": "stage_role", "label": "Rolle", "type": "enum", "options": ["primary", "main", "polishing"], "required": true },
    { "key": "filter_type", "label": "Filtertyp", "type": "enum", "options": ["<prod filter_type tokens — copied from prior.json>"], "required": true, "discriminator": true },
    { "key": "system_size", "label": "Anlagengröße", "type": "enum", "options": ["<prod system_size_category tokens>"], "required": true },
    { "key": "sewer", "label": "Kanalsystem", "type": "enum", "options": ["<prod sewer_system_type tokens>"], "required": true },
    { "key": "cells", "label": "Anzahl Teilflächen", "type": "number", "min": 1 },
    { "key": "area_m2", "label": "Filterfläche A_F (Beckensohle)", "type": "number", "unit": "m²", "required": true, "min": 0 },
    { "key": "a_spez_min", "label": "A_spez,min", "type": "derived", "expr": "if(sewer == '<M token>', lookup('TABLE_LIMITS', filter_type, system_size, 'm', 'a_fo_spez_min'), lookup('TABLE_LIMITS', filter_type, system_size, 'tr', 'a_fo_spez_min'))" },
    { "key": "a_min_m2", "label": "A_min = EZ·A_spez", "type": "derived", "expr": "a_spez_min * EZ" },
    { "key": "area_ok", "label": "A_F ≥ A_min", "type": "derived", "expr": "if(area_m2 >= a_min_m2, 1, 0)" },
    { "key": "f_a_f_csb", "label": "f_A,F,CSB", "type": "number", "unit": "g/(m²·d)" },
    { "key": "f_a_f_csb_max", "label": "max (Tab.)", "type": "derived", "expr": "lookup('TABLE_LIMITS', filter_type, system_size, 'any', 'f_a_f_csb_max')" },
    { "key": "q_beschickung", "label": "q_Beschickung", "type": "number", "unit": "l/(m²·min)" },
    { "key": "h_beschickung", "label": "h_Beschickung", "type": "number", "unit": "l/m²" },
    { "key": "t_sicker_h", "label": "t_Sicker,min,aM", "type": "number", "unit": "h", "visible_when": "system_size == '<municipal token>'" },
    { "key": "l_rieselr_m", "label": "Σ L_Rieselr", "type": "number", "unit": "m", "visible_when": "filter_type == '<two-layer trench token>'" },
    { "key": "a_awf_m2", "label": "A_AWF", "type": "number", "unit": "m²", "visible_when": "filter_type == '<lava sand token>' AND sewer == '<M token>'" }
  ] }
```
(`EZ` in a `derived` expr is read through `RegisterRowsCtx.symbol` — Plan 2a T5 passes the worksheet scope; the executor confirms in `register-rows.ts` that `evalValue` receives `scope.symbol` for non-row symbols; if not → G-13 interface note and `a_min_m2` becomes the worksheet equation `A262-10-D2` instead.) Every G-1 multi-key lookup column is marked `// G-1` in the module.
`rieselrohre` (A262-15, **create**) → columns `label text`, `length_m number required` (per pipe), `width_m number`; aggregate below. `ueberlaufbauwerke` (A262-06, **create**) → columns `label text`, `type enum [rueb, rue]`, `q_dr number l/s`, `q_krit number l/s`. `ablaufproben` (A262-08, **create**) → columns `date date required`, `csb number mg/l required`, `nh4_n number mg/l`, `temperature_c number`; 4-of-5 equation below.
`hf_material` (A262-27, **create** enum `coarse_sand`/`gravel`, labels lifted Table 16) → `select_one`; `f_A_ANF_CSB_max` (**create** number) → `lookup_fill` `{ TABLE16, role limit, keys [{ column 'material', from_symbol 'hf_material' }], value 'f_a_anf_csb_max' }`, gate `f_A_ANF_CSB <= f_A_ANF_CSB_max` STAGED replacing REQ-91's fixed 200 (`a262e-G-2`).
`lining_type` block (A262-29): `geomembrane_thickness_mm` etc. `visible_when "lining_type == '<geomembrane token>'"`; `mineral_seal_layer_count` `visible_when "lining_type == '<mineral token>'"`; the 1.0-mm PE exception (small system, no welds, PE) is a STAGED gate `a262e-G-3`; `lava_sand_clay_fraction_pct` visible when `filter_type == '<lava token>'` and REQ-15 guard `IF filter_type != '<lava token>' THEN fines <= 2` STAGED `a262e-G-4`.

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| top-level sections of A262-05 | `sewer_system_type == '<separate token>'` | §4.2.6 "differs depending on the type of sewer network" |
| top-level sections of A262-06 | `sewer_system_type == '<combined token>'` | same; overflow filter §4.3.3.6 |
| top-level sections of A262-11…-16 | `system_size_category == '<small token>'` (each worksheet additionally `AND filter_type == '<its type>'`) | §1 "up to 50 P"; Tables 17/18 |
| top-level sections of A262-19…-23 | `system_size_category == '<municipal token>' AND filter_type_KomKA == '<its type>'` | Table 18 |
| top-level sections of A262-25 | `seasonal_operation == '<true token>'` | §4.3.4 |
| top-level sections of A262-26 | `wastewater_type == 'greywater_only'` | §4.3.5 |
| top-level sections of A262-28 | `enhanced_effluent == '<true token>'` | §4.5 |
| `e_0`-style Misch-only fields (none here) | — | — |

Drivers `system_size_category`, `sewer_system_type`, `seasonal_operation`, `wastewater_type`, `enhanced_effluent` live on A262-02 → check `consumer_worksheets` in prior; missing targets → STAGED consumer edits `a262e-C-1…5`. Gate guards STAGED: REQ-11 f_red only for VF sand (`a262e-G-5`), REQ-12 greywater 50 % (`a262e-G-6`), REQ-33…36 pattern extended to the other filter types (`a262e-G-7`).

- [ ] **Step 5: Derived** (the inventory's seven described-but-unregistered, plus aggregates):

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `A262-10-D1` | A262-10 | `A_Fo_gesamt = sum_rows(filterstufen, if(stage_role == 'main', area_m2, 0))` | `filterstufen` | §4.3.1 "Downstream filter areas may not be considered" |
| `A262-10-D2` | A262-10 | `filterstufen_area_fail = count_rows(filterstufen, area_ok == 0)` | `filterstufen` | Tables 17/18 (gate `== 0` STAGED `a262e-G-8`) |
| `A262-11-D1` | A262-11 | `A_Fo_min_KA = EZ * A_Fo_spez` | `EZ`, `A_Fo_spez` | desc in A262-11 ("A_Fo,min = EZ · A_Fo,spez") — lift the printed sentence |
| `A262-21-D1` | A262-21 | `A_F_CSB = B_CSB_KomKA / f_A_F_CSB_KomKA_in` | as named | Table 10 definition |
| `A262-22-D1` | A262-22 | `V_F = A_Fu * h_F` | as named | desc |
| `A262-26-D1` | A262-26 | `Q_GW_taeglich = EW_Grauwasser * Q_Grauwasser` | as named | §4.3.5 |
| `A262-26-D2` | A262-26 | `A_Fo_spez_GW = 0.5 * A_Fo_spez` (0.5 = "50 %" printed) | `A_Fo_spez` | §4.3.5 |
| `A262-12-D1` | A262-12 | `A_F_VFKS_total = A_Fo1 + A_Fo2` (prod symbols) | as named | Table 5 |
| `A262-09-D1` | A262-09 | `B_CSB_KomKA = EZ * B_CSB / 1000` (1000 = g→kg, printed unit conversion) | `EZ`, `B_CSB` | Table 1 units |
| `A262-07-D1` | A262-07 | `aufenthaltszeit = V_VB / Q_Tr_h_max` | as named | §4.2.2 |
| `A262-15-D1` | A262-15 | `L_Rieselr_sum = sum_rows(rieselrohre, length_m)`; `rieselrohr_max_len = max_rows(rieselrohre, length_m)` | `rieselrohre` | Table 8 (≤ 18 m each; ≥ 6 m/P total) |
| `A262-06-D1` | A262-06 | `Q_Dr_RU_sum = sum_rows(ueberlaufbauwerke, q_dr)`; `Q_krit_sum = sum_rows(ueberlaufbauwerke, q_krit)` | register | Gl. 8 "Σ" |
| `A262-08-D1` | A262-08 | `csb_last5_ok = count_rows(last_rows(ablaufproben, 5), csb <= CSB_limit)` (`CSB_limit` = existing limit symbol on A262-08, else created number) | `ablaufproben`, `CSB_limit` | §? "4 of the last 5 samples" — lift; gate `>= 4` STAGED `a262e-G-9` |

STAGED rulings: Gl. 6 vs 8 switch by created `entlastung_typ` select_one (`a262e-R-1`); Gl. 11 clamp `f_red = max(t_Reg / 12, 0.5)` (`a262e-R-2`, §4.3.4 quote); Gl. 13/14 identical RHS — source check, no formula proposed (`a262e-R-3`); `EZ`/`w_s_d` duplicates on A262-05 → consumer edits (`a262e-X-1`).

- [ ] **Step 6: Emit + tests** (`a262e`, `20260917100300` / `…10` / `…20`); render test: `filterstufen` two rows of different `filter_type`, discriminator-driven column visibility, `a_min_m2` derived.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `a262e-verify.integration.test.ts`; §5 wins: 1 partially (register built; worksheet collapse Phase 6), 2 ✓, 3 ✓ equations / inheritance STAGED, 4 ✓ sections, 5 ✓ + G-3 STAGED.

---
### Task 4: DWA-M-277E — Grauwasserquelle rows (Table 2) → type A1/A2/B1/B2 + Σ Q_GW; Verbraucher rows (Table 5) → Q_SW + highest quality category; Table 4 limits and allowed processes by category

**Inputs:** inventory `…/inventory/DWA-M-277E.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-277E\DWA-M_277E (1).md` (English); harness `tests/harness/m277e-verify.integration.test.ts`, `seed-m277e.ts`; prod: 24 worksheets, 198 fields, 22 equation rows (5 real), 88 requirements. Already on the mechanism: `source_set` is one of the 36 selection configs (Plan 1 T8 migration `20260911120000_selection_configs_DWA_M_277E.sql`) — the register below supersedes it functionally; `source_set` stays (D-1) and gets a `visible_when` of `false`? No — never hide a produced symbol; it stays visible and is listed for retirement (`m277e-X-1`).

**Estimated size:** tables 5 (TABLE2 ≈6 source rows + TABLE2_TYPE ≈4 type rows, TABLE3 ≈3, TABLE1_SIEVERS ≈6, TABLE4 ≈ (2 categories × ≈8 params) + allowed uses, TABLE5 ≈6) / registers 5 (`grauwasserquellen`, `verbraucher_sw`, `nutzungsarten`, `ablaufproben_treated`, `speicher_277`) / select_one 0 new (drivers exist: `quality_category`, `use_category`, `building_type`, `inflow_type`) / lookup_fill 7 (Table 4 limits, role `limit`) / field `visible_when` 9 / section 0 / equations 8 new + 4 staged (Eq. 3/4 identical, worked-example rows) / sign-off ≈ 11. Time saved (§5): one source row per Grauwasserquelle instead of json set + 6 scalars + typed type on two worksheets; Verbraucher rows summing to `Q_SW`; `quality_category` drives limits and process list; ~90 duplicate fields (Phase 6); storage/MBO derived.

**Files:** `regulation-tables-seed-m277e.ts`, `field-configs/m277e.ts` + prior, `equations/m277e.ts`, tests, `register-m277e-quellen.test.tsx`, `scripts/verification/m277e-STAGED-plan3-rulings.sql`, report; migrations `20260917100400` / `…10` / `…20`.

- [ ] **Step 1: Read.** Inventory; transcript §5 Table 2 + the type definitions (A1 bathtubs+showers; A2 + hand washbasins; B1 + washing machines; B2 + kitchen), Table 3, Table 1 (Sievers columns), §6.3 Table 4 (+ UV note), §9.2 Table 5 + Eq. (1)–(4) and the worked example, §4.2 MBO 50 m³, §9.4 Q_WB. Capture prior (note `source_set` prior `enum_values` from the Plan-1 migration — keep).

- [ ] **Step 2: Tables** (`standard_code 'DWA-M-277E'`):

| table_code | key_columns | value_columns | policy (cue) | rows |
|---|---|---|---|---|
| `TABLE2` | `source` (shower/bathtub/hand_washbasin/washing_machine/kitchen_sink/dishwasher — reuse prod `source_set` option tokens, D-1) | `q_gw_p_min`, `q_gw_p_max` (l/(P·d)), `cod_min`, `cod_max` (mg/l), `ss_min`, `ss_max`, `ph_min`, `ph_max`, `hydraulic_min`, `hydraulic_max` (l/min) — ranges as min/max pairs; cells spanning several columns repeated per source with the same quote | `anhaltswert` ("The load values listed below serve as orientation values"; §9.1) + SR-2 (`m277e-J-1`: the per-source Q_GW-P,i is an engineer pick inside the printed range) | Table 2 |
| `TABLE2_TYPE` | `greywater_type` (a1/a2/b1/b2 — prod `greywater_type` tokens, D-1) | `q_gw_total_min`, `q_gw_total_max` (l/(P·d)), `includes_shower_bath` (boolean), `includes_basin`, `includes_washing_machine`, `includes_kitchen` — the four membership flags lifted from the §5 definition sentences | `locked` (type definitions) | Table 2 "Greywater type" row + §5 sentences |
| `TABLE3` | `greywater_type_group` (a/b1/b2) | `total_coliforms_min/max`, `faecal_coliforms_min/max` (1/ml, stored as printed exponent strings AND numbers — `string` columns `total_coliforms_range`, `faecal_coliforms_range`) | `anhaltswert` ("wide range") | Table 3 |
| `TABLE1_SIEVERS` | `parameter` (tos/cod/bod5/tn/tp/ts/water_volume) | `mean`, `p85` (unit per row, lifted) | `anhaltswert` ("recommended as design values") | Table 1 Sievers column (other columns: `m277e-J-2` optional second table) |
| `TABLE4_LIMITS` | `quality_category` (c1/c2 — prod tokens), `parameter` (turbidity/bod5/o2/ph_min/ph_max/total_coliforms/e_coli/p_aeruginosa) | `limit` (number, nullable = "no requirement"), `comparator` (string ≤/≥/–), `unit` | `locked` (requirements) — split per parameter into single-key tables `TABLE4_<PARAM>` keyed by `quality_category` because `lookup_fill` keys cannot be literals (G-12) | Table 4 rows |
| `TABLE4_USES` | `use_category` (prod tokens), `quality_category` | `allowed` (boolean "+"/"−") | `locked` (Laundry "strongly recommended" C2 → `m277e-P-1`) | Table 4 use rows |
| `TABLE4_PROCESSES` | `quality_category` × `process` (fb/sf/flb/stabilisation/mbr/uv/uf/ro) | `allowed` (boolean) | `anhaltswert` ("Exemplary processes") | Table 4 last row |
| `TABLE5` | `application` (toilets/personal_hygiene/washing_machine/cleaning_irrigation/cooking_drinking/kitchen_dishwasher) | `q_sw_p` (l/(P·d)) | `anhaltswert` ("provides assistance") | Table 5; the area value 60 l/m² + season length in §9.2 → `TABLE5_AREA` key `use`(kitchen_garden), values `q_sw_a_l_m2`, `season_d` |

- [ ] **Step 3: Registers / selections**

`grauwasserquellen` (M277E-06, **create** `json`) → `register`:
```json
{ "title": "Grauwasserquellen", "subtitle": "§5 Tab. 2 — je Quelle Personen und spezifischer Anfall", "add_label": "+ Quelle",
  "columns": [
    { "key": "source", "label": "Quelle", "type": "lookup_key", "required": true, "lookup": { "table_code": "TABLE2" } },
    { "key": "persons", "label": "P_i", "type": "number", "required": true, "min": 0 },
    { "key": "q_min", "label": "Q_GW-P min (Tab. 2)", "type": "lookup_value", "lookup": { "table_code": "TABLE2", "key_column": "source", "value": "q_gw_p_min" } },
    { "key": "q_max", "label": "Q_GW-P max (Tab. 2)", "type": "lookup_value", "lookup": { "table_code": "TABLE2", "key_column": "source", "value": "q_gw_p_max" } },
    { "key": "q_gw_p", "label": "Q_GW-P,i gewählt", "type": "number", "unit": "l/(P·d)", "required": true, "min": 0 },
    { "key": "in_range", "label": "im Bereich", "type": "derived", "expr": "if(q_gw_p >= q_min AND q_gw_p <= q_max, 1, 0)" },
    { "key": "q_row", "label": "Q_GW,i", "type": "derived", "expr": "q_gw_p * persons" }
  ],
  "sum_column": { "key": "q_row", "label": "Σ Q_GW", "unit": "l/d" } }
```
`verbraucher_sw` (M277E-15, **create**) → columns `application lookup_key TABLE5 required`; `persons number min 0`; `q_sw_p lookup_value {TABLE5, application, q_sw_p}`; `area_m2 number` + `q_sw_a number l/m²` + `season_d number` (visible_when `application == '<irrigation token>'` — Table 5 has no irrigation row; the §9.2 example supplies 60 l/m²/season → `lookup_value` on `TABLE5_AREA`); `q_row derived expr "if(application == '<irrigation token>', q_sw_a * area_m2 / season_d, q_sw_p * persons)"`; `quality_required enum [c1, c2]` per row from `TABLE4_USES`? — the row's required category is `lookup('TABLE4_USES_MIN', application, 'min_category_code')` where `TABLE4_USES_MIN` is a derived single-key table the executor seeds from Table 4 (per use: 1 if C1 allowed else 2) — each row quoted with its printed "+/−" cells; column `min_cat derived expr "lookup('TABLE4_USES_MIN', application, 'min_category_code')"`.
`nutzungsarten` (M277E-10, **create**) → columns `use_category enum [<prod tokens>] required discriminator`, `laundry_private boolean visible_when "use_category == '<laundry token>'"`, `din_19650_class text visible_when "use_category IN {<irrigation tokens>}"` (reference — content-boundary), `drinking_water_option boolean visible_when "use_category IN {<laundry, cleaning tokens>}"`.
`ablaufproben_treated` (M277E-24, **create**) → columns `date date required`, `location enum [reservoir, consumer]`, `turbidity_ntu number`, `bod5 number`, `o2_sat_pct number`, `ph number`, `total_coliforms number`, `e_coli number`, `p_aeruginosa number`; per-parameter pass columns `derived` comparing to the `lookup_fill` limit symbols below (`expr: "if(turbidity_ntu <= turbidity_limit, 1, 0)"` — worksheet symbols readable in row scope, see Task 3 G-13 check).
`speicher_277` (M277E-21, **create**) → columns `label text`, `role enum [pre, post, buffer]`, `volume_l number required min 0`.
Table 4 limits → `lookup_fill` role `limit` on **created** number fields `turbidity_limit`, `bod5_limit`, `o2_sat_min`, `ph_min_limit`, `ph_max_limit`, `total_coliforms_limit`, `e_coli_limit`, `p_aeruginosa_limit` (M277E-14) keyed `[{ column: 'quality_category', from_symbol: 'quality_category' }]` on `TABLE4_<PARAM>`; existing REQ-08/09/14/14E/15 gates already guard C2 — rewriting them onto the limit symbols is STAGED (`m277e-G-1`).
`treatment_method` allowed set by category: `visible_when` on `selected_hygienisation` = `quality_category == 'c2'`; the allow-list itself is a STAGED gate `m277e-G-2` (`IF quality_category == 'c1' THEN treatment_method IN {…}` with the Table 4 quote).

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| Table-4 limit fields + `sampling_location` (M277E-14) | `quality_category == 'c2'` | Table 4 C1 column "No requirement" |
| `selected_hygienisation`, `UV_transmission_pct` (M277E-19/20) | `quality_category == 'c2'` | Table 4 "MBR + UV, UF, RO"; UV note |
| `DIN_19650_class_documented`, `Q_SW_A`, `A`, `irrigation_season_length` (M277E-11/16) | `use_category IN {<irrigation tokens>}` | §6.2.4 |
| `drinking_water_option_available` (M277E-12) | `building_type == '<rented_apartment token>'` | BVerwG sentence (REQ-30 guard exists; visibility added) |
| `pump_station_capacity` (M277E-21) | `inflow_type == '<pump_station token>'` | Annex A |
| `MBO_authorisation_required` (M277E-05) | equation below; field stays | §4.2 |
| `hybrid`/`WHG_permit_present` (M277E-01/24) | `discharge_into_water_body == true` | §4.3 |
| `turbidity_NTU_C1` (dead placeholder) | *(never hide — list for deactivation `m277e-S-1`)* | — |

STAGED gate guards: REQ-24 (`IF use_category IN {irrigation} THEN DIN_19650_class_documented == true`, `m277e-G-3`); REQ-13 (`m277e-G-4`); the ~40 `-2` duplicate REQ codes with warn/block mismatches (`m277e-G-5`, list each pair with severities).

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `M277E-07-D1` | M277E-07 | `Q_GW_rows = sum_rows(grauwasserquellen, q_gw_p * persons)` | register | Eq. (2) — replacing the existing Eq. (2) row (inputs `Q_GW_P`, `P`) = `m277e-R-1` STAGED; `Q_GW` stays its output name only after ratification |
| `M277E-06-D1` | M277E-06 | `greywater_type_code = if(count_rows(grauwasserquellen, source IN {'kitchen_sink', 'dishwasher'}) > 0, 4, if(count_rows(grauwasserquellen, source == 'washing_machine') > 0, 3, if(count_rows(grauwasserquellen, source == 'hand_washbasin') > 0, 2, 1)))` — the four membership rules lifted from §5 (A1 bathtubs+showers; A2 +basins; B1 +washing machines; B2 +kitchen); `count_rows` with an `IN` condition is a condition node (supported) | register | §5 type definitions; G-6: numeric code 1–4, companion table `TABLE2_TYPE` gives the label; `greywater_type` (manual enum) derivation = `m277e-D-1` |
| `M277E-16-D1` | M277E-16 | `Q_SW_rows = sum_rows(verbraucher_sw, q_row)` | register | Eq. (1) — `m277e-R-2` for the existing Eq. (1) |
| `M277E-14-D1` | M277E-14 | `quality_category_code = max_rows(verbraucher_sw, min_cat)` | register | "Decisive for system dimensioning is the highest quality standard"; `quality_category` (manual) derivation `m277e-D-2` |
| `M277E-18-D1` | M277E-18 | `Q_GWT_calc = min(Q_GW, Q_SW)` | as named | Eq. (3)/(4) — they are one `min()` (existing rows already identical; the worked-example "equations" `Ex. 9.2/9.3/9.4` → deactivation STAGED `m277e-R-3`) |
| `M277E-21-D1` | M277E-21 | `storage_capacity_calc_m3 = sum_rows(speicher_277, volume_l) / 1000` (1000 = l→m³) | register | §4.2 |
| `M277E-05-D1` | M277E-05 | `mbo_authorisation_code = if(storage_capacity_calc_m3 > 50, 1, 0)` (50 printed §4.2) | as named | §4.2; the two booleans → `m277e-D-3` |
| `M277E-24-D1` | M277E-24 | `treated_samples_fail = count_rows(ablaufproben_treated, turbidity_ok == 0 OR bod5_ok == 0 OR e_coli_ok == 0 OR p_aeruginosa_ok == 0 OR total_coliforms_ok == 0)` | register + limit symbols | Table 4; gate `== 0` STAGED `m277e-G-6` |
| `M277E-18-D2` | M277E-18 | `V_buffer_calc = Q_GWT_calc * 1` (1 d — REQ-19 text "1 d") | as named | §9.4; existing buffer equation duplicate → `m277e-R-4` |

Annual balance (`V_*_annual`, `drinking_water_savings_rate`) needs a per-period register (`bilanzperioden` with `days`, `q_wb`) → **create** register `bilanzperioden` columns `label text`, `days number`, `q_gw number`, `q_sw number`, `q_wb derived expr "q_gw - q_sw"`; equations `V_surplus_annual = sum_rows(bilanzperioden, if(q_wb > 0, q_wb * days, 0)) / 1000`, `V_topup_annual = sum_rows(bilanzperioden, if(q_wb < 0, 0 - q_wb * days, 0)) / 1000` (`0 - x` because unary minus of a sub-expression — check parser support for `-(…)`; Plan 2a T1 accepts unary `-`), `V_treated_annual = sum_rows(bilanzperioden, min(q_gw, q_sw) * days) / 1000`; `drinking_water_savings_rate` needs a total demand basis the text does not print → `m277e-F-1`.

- [ ] **Step 6: Emit + tests** (`m277e`, `20260917100400` / `…10` / `…20`). Render test: `grauwasserquellen` two rows, `q_min/q_max` fill, `in_range` flag, Σ.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `m277e-verify`; §5 wins 1 ✓, 2 ✓, 3 ✓ (limits) / allow-list STAGED, 4 Phase 6 (`m277e-X-2` lists the ~90 duplicates with the owner worksheet each), 5 ✓.

---

### Task 5: DWA-M-1200-1 — Tab. 7 crop questionnaire → strictest class (Tab. 8 limits), Arbeitshilfe C/D risk rows with Tab. 23 matrix, Flächenverzeichnis rows, Tab. 27 sampling plan, routine samples → compliance %

**Inputs:** inventory `…/inventory/DWA-M-1200-1.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-1200-1\DWA-M_1200-1_GD.md`; harness `tests/harness/m1200-1-verify.integration.test.ts`, `seed-m1200-1.ts`; prod: 20 worksheets, 126 fields, 1 equation (EQ-001 Tab. 23 lookup), 22 requirements. `indikatorchemikalien_kat1/2` are I-1 sign-off pairs (non-null prod enum) — untouched here (`m1200_1-E-1` repeats the pending ruling).

**Estimated size:** tables 6 (TAB8 ≈4 class rows × params → split into single-key tables per parameter `TAB8_ECOLI`, `TAB8_ENTEROKOKKEN`, `TAB8_BSB5`, `TAB8_AFS`, `TAB8_TRUEBUNG`, `TAB8_LOG10` (≈4 rows each; class column OCR-damaged → each class token assigned from the caption order and cross-checked against DWA-M-1200-2 Tab. 3 which is verbatim identical — record in `m1200_1-U-1`); TAB7_CLASS ≈6 rows (class → method set, Karenzzeit text); TAB23 ≈25 cells; TAB27 ≈4 rows × 7 params (class-C E. coli cell merged → not seeded, `m1200_1-U-2`); TAB19 ≈3; TAB8_NOTE_F ≈2 (filter type → NTU ceilings); TAB18 ≈9 Schutzgut rows) / registers 5 (`kulturen_tab7`, `risiko_zeilen` (Arbeitshilfe C), `stoerfaelle` (Arbeitshilfe D), `flaechenverzeichnis`, `routineproben`) + `messstellen` (§6.6.3) / select_one 0 new (drivers exist: `gueteklasse_zugeordnet`, `filtration_typ`, `spurenstoffentfernung_szenario`, `aerosolrisiko`, `anwendungsbereich_kategorie`) / lookup_fill 7 (Tab. 8 limits role `limit` onto created `*_limit` fields; Tab. 27 frequencies onto created text fields) / field `visible_when` 8 / section 0 / equations 7 new + 1 staged (CR-004 class-D contradiction) / sign-off ≈ 12. Time saved (§5): class derived with the strictest rule and Tab. 8 targets read-only; risk rows with the matrix computed per row; Flächenverzeichnis feeding class/count/demand; full Tab. 27 plan; compliance % computed.

**Files:** `regulation-tables-seed-m1200_1.ts`, `field-configs/m1200_1.ts` + prior, `equations/m1200_1.ts`, tests, `register-m1200-1-risiko.test.tsx`, STAGED file, report; migrations `20260917100500` / `…10` / `…20`.

- [ ] **Step 1: Read.** Inventory; transcript l.981–1120 (Tab. 7), l.1143–1145 (§5.2 90 %/50 % rules), l.1151ff (Tab. 8 + notes b, d, e, f), l.1886 (Tab. 18), l.1965 (Tab. 19), l.2048 (Tab. 23), Tab. 24/25 (Arbeitshilfe C columns), Tab. 26 (Arbeitshilfe D), l.2378 (Tab. 27), §6.3.4, §6.6.3, CR-015 Flächenverzeichnis sentence. Read DWA-M-1200-2 Tab. 3 only to resolve the OCR class column (cite both lines in the quote note).

- [ ] **Step 2: Tables** (`standard_code 'DWA-M-1200-1'`, class tokens = prod `gueteklasse_zugeordnet` enum values A/B-1/B-2/C-1/C-2/D — D-1):

| table_code | key_columns | value_columns | policy (cue) | rows |
|---|---|---|---|---|
| `TAB8_ECOLI` | `klasse` | `limit_kbe_100ml` (number, nullable "–") | `locked` ("Mindestanforderungen") | Tab. 8 (B-1/B-2 share the B row; C-1/C-2 the C row — one row per printed row, keyed by the printed class label token `a`/`b`/`c`/`d`; the sub-class mapping b-1/b-2 → `b` is a second tiny table `TAB8_CLASSMAP` keyed by prod token) |
| `TAB8_ENTEROKOKKEN`, `TAB8_BSB5` (value nullable + `note` "gemäß RL 91/271/EWG"), `TAB8_AFS`, `TAB8_TRUEBUNG` | `klasse` | `limit` (number, nullable), `note` (string) | `locked`; notes d)/e) (TOC/turbidity substitution) into `override_quote` → `messwert`-like substitution rule `m1200_1-P-1` | Tab. 8 |
| `TAB8_LOG10` | `klasse_sub` (a/b-1/c-1 — rows with targets; b-2/c-2/d have "–") × `organism` (e_coli/somatic_coliphages/f_coliphages/clostridium/sulfate_reducers) — split per organism into `TAB8_LOG10_<ORG>` keyed `klasse_sub` | `target_log10` (number) | `locked`; note b) pass shares (90 % / 50 %) → `TAB8_PASS_SHARE` keyed `klasse_sub`, value `min_share_pct` | Tab. 8 last column + note b |
| `TAB8_NOTE_F` | `filtration_typ` (prod tokens; the two printed groups "Polstofffilter/Mikrosiebe/Raumfilter" vs "Membranverfahren" mapped, `m1200_1-E-2`) | `ntu_avg_24h`, `ntu_5pct`, `ntu_never` (number) | `anhaltswert` ("sollten … nicht überschreiten") | note f) |
| `TAB7_CLASS` | `klasse_sub` (a/b-1/b-2/c-1/c-2/d) | `methods_allowed` (string, lifted), `karenzzeit_text` (string), `emitter_tropf_cm`, `emitter_mikro_cm` (number, nullable), `laktierend_excluded` (boolean) | `locked` (Tab. 4 note (*) strictest rule → `override_quote`) | Tab. 7 class-defining rows l.981–1120 |
| `TAB23` | `wahrscheinlichkeit` (a…e — prod `eintrittswahrscheinlichkeit` tokens), `schadensausmass` (1…5 — prod tokens) | `risikoniveau` (string — prod `risikoniveau_ausgangs` tokens) , `risikoniveau_code` (number 1–5 for max_rows) | `locked` ("Risikoniveau = Eintrittswahrscheinlichkeit × Schadensausmaß") | l.2048 (25 cells) |
| `TAB27_<PARAM>` (7 tables) | `klasse` (a/b/c/d) | `frequency` (string, lifted) | `locked` ("Mindesthäufigkeit") | l.2378; class-C E. coli not seeded (`m1200_1-U-2`) |
| `TAB19` | `kategorie` (1/2/3) | `substances` (string, lifted list), `limit_text` (string) | `anhaltswert` ("empfohlen") | l.1965 |
| `TAB18` | `schutzgut_code` (m1/m2/m3/b/n/k/g/o/s) | `schutzgut` (string), `expositionsweg` (string), `bewertung_default` (string, nullable) | `anhaltswert` (template) | l.1886 |

- [ ] **Step 3: Registers / selections**

`kulturen_tab7` (M12001-08, **create**) → `register` (one row per irrigated crop/area type the engineer names): `label text required`; `klasse_sub lookup_key TAB7_CLASS required` (the engineer picks the printed row that describes the crop; the 12 yes/no questions stay as they are and `m1200_1-J-1` proposes mapping them to rows later); `methods lookup_value {TAB7_CLASS, klasse_sub, methods_allowed}`; `karenzzeit lookup_value {…, karenzzeit_text}`; `laktierend boolean`; `klasse_code derived expr "lookup('TAB7_RANK', klasse_sub, 'rank')"` where `TAB7_RANK` is a 6-row table ranking strictness (A strictest … D) — the ranking order is the printed caption order ("Wassergüteklasse A, B (B-1/B-2), C (C-1/C-2), D"), quoted.
`risiko_zeilen` (M12001-07, **create**) → `register`:
```json
{ "title": "Risikobewertung (Arbeitshilfe C)", "subtitle": "Tab. 24/25 — je Gefahr × Schutzgut eine Zeile; Risikoniveau nach Tab. 23", "add_label": "+ Zeile",
  "columns": [
    { "key": "gefahr", "label": "Gefahr", "type": "enum", "options": ["mikrobiologisch", "schwermetalle", "pfas", "spurenstoffe", "salze", "mikroplastik"], "required": true },
    { "key": "schutzgut", "label": "Schutzgut", "type": "lookup_key", "required": true, "lookup": { "table_code": "TAB18" } },
    { "key": "expositionsweg", "label": "Expositionsweg", "type": "lookup_value", "lookup": { "table_code": "TAB18", "key_column": "schutzgut", "value": "expositionsweg" } },
    { "key": "schadensausmass", "label": "Schadensausmaß", "type": "enum", "options": ["<prod schadensausmass tokens>"], "required": true },
    { "key": "erwaegung_schaden", "label": "Erwägungsgrund", "type": "text" },
    { "key": "wahrscheinlichkeit", "label": "Wahrscheinlichkeit", "type": "enum", "options": ["<prod eintrittswahrscheinlichkeit tokens>"], "required": true },
    { "key": "erwaegung_wahrsch", "label": "Erwägungsgrund", "type": "text" },
    { "key": "ausgangsrisiko", "label": "Ausgangsrisiko", "type": "derived", "expr": "lookup('TAB23', wahrscheinlichkeit, schadensausmass, 'risikoniveau')" },
    { "key": "ausgangsrisiko_code", "label": "(code)", "type": "derived", "expr": "lookup('TAB23', wahrscheinlichkeit, schadensausmass, 'risikoniveau_code')" },
    { "key": "massnahmen", "label": "Vorsorgemaßnahmen", "type": "text", "visible_when": "ausgangsrisiko_code >= 3" },
    { "key": "rest_schaden", "label": "Restrisiko Schadensmaß", "type": "enum", "options": ["<prod tokens>"], "visible_when": "ausgangsrisiko_code >= 3" },
    { "key": "rest_wahrsch", "label": "Restrisiko Wahrscheinlichkeit", "type": "enum", "options": ["<prod tokens>"], "visible_when": "ausgangsrisiko_code >= 3" },
    { "key": "restrisiko_code", "label": "Restrisiko", "type": "derived", "expr": "if(ausgangsrisiko_code >= 3, lookup('TAB23', rest_wahrsch, rest_schaden, 'risikoniveau_code'), ausgangsrisiko_code)" }
  ] }
```
(the `>= 3` = "moderat" threshold is the §6.3.4 sentence "moderates oder hohes Risikoniveau … reduziert" — lifted; the code column of TAB23 is the executor's ranking of the five printed levels in caption order, recorded in the builder comment.)
`stoerfaelle` (M12001-14, **create**) → columns `teilelement text`, `teilprozess text`, `ereignis text required`, `gefaehrdung enum [<the Tab. 26 Art der Gefährdung list, lifted>]`, `schadensausmass enum`, `wahrscheinlichkeit enum`, `risiko_code derived (TAB23)`.
`flaechenverzeichnis` (M12001-16, **create**) → columns `flaeche text required`, `flaeche_ha number`, `kultur text`, `klasse_sub lookup_key TAB7_CLASS required`, `methode text`, `menge_m3 number`, `karenzzeit lookup_value`.
`routineproben` (M12001-09, **create**) → columns `date date required`, `parameter enum [e_coli, enterokokken, bsb5, afs, truebung, legionella, nematoden]`, `wert number required`, `limit derived expr "if(parameter == 'e_coli', e_coli_limit, if(parameter == 'enterokokken', enterokokken_limit, if(parameter == 'bsb5', bsb5_limit, if(parameter == 'afs', afs_limit, if(parameter == 'truebung', truebung_limit, if(parameter == 'legionella', legionella_limit, nematoden_limit))))))"`, `ok derived expr "if(wert <= limit, 1, 0)"`.
`messstellen` (M12001-13, **create**) → columns `parameter text`, `matrix enum [boden, wasser, pflanze]`, `partei text`, `intervall text`, `ort text`, `vorbelastung number`, `messwert number`, `bbodschv_wert number` (reference — external law, engineer-entered).
Tab. 8 limits → `lookup_fill` role `limit` on **created** `e_coli_limit`, `enterokokken_limit`, `bsb5_limit`, `afs_limit`, `truebung_limit` (M12001-09) keyed `[{ column: 'klasse', from_symbol: 'gueteklasse_group' }]` where `gueteklasse_group` is a created `lookup_fill` text field on `TAB8_CLASSMAP` keyed on `gueteklasse_zugeordnet` (G-6 chain: sub-class → printed row). `legionella_limit`, `nematoden_limit` from the "Fallspezifisch" cell (single-row tables `TAB8_LEGIONELLA`, `TAB8_NEMATODEN` with the condition text). Tab. 27 → `lookup_fill` on created text fields `beprobung_frequenz_<param>` ×7 keyed on `gueteklasse_group`; existing `beprobung_frequenz_e_coli` re-keyed (its prod `enum_values` kept, D-1 — mismatch with lifted strings `m1200_1-E-3`).

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| `legionella_value`, `legionella_limit`, `beprobung_frequenz_legionella` | `aerosolrisiko == true` | Tab. 8 "wenn das Risiko der Aerosolbildung besteht" |
| `nematoden_value`, `nematoden_limit`, `beprobung_frequenz_nematoden` | `anwendung_weide_oder_futterpflanzen == true` | Tab. 8 "für die Bewässerung von Weideflächen oder Futterpflanzen" |
| `log10_*` targets, `validierungs_compliance_pct` | `gueteklasse_zugeordnet IN {'A', 'B-1', 'C-1'}` (prod tokens) | Tab. 8 B-2/C-2/D "–" |
| `truebung_max_value`, `bsb5_value` | `filtration_typ IS NOT NULL` / stays; note-f ceilings `lookup_fill` on created `truebung_avg_limit`, `truebung_5pct_limit`, `truebung_never_limit` keyed `filtration_typ` | note f) |
| `indikatorchemikalien_*`, `pfas20_value` | `spurenstoffentfernung_szenario == '<szenario I token>'` | Bild 6 / Tab. 19 |
| `beschilderung_urbane_flaechen` | `anwendungsbereich_kategorie == '<urban token>'` | CR-021 (guard STAGED `m1200_1-G-1`) |
| `restrisiko_niveau` (scalar) | stays; derived per row above (`m1200_1-D-1`) | — |
| `bsb5_value` optional when TOC + correlation | STAGED `m1200_1-G-2` (needs a created boolean `toc_korrelation_nachgewiesen`) | note d |

STAGED gates: CR-004 class-D limit "≤ 1" vs Tab. 8 "≤ 10.000" — the gate rewrite onto `e_coli_value <= e_coli_limit` (`m1200_1-G-3`, evidence both lines); CR-006/CR-014/CR-007 onto the equations below (`m1200_1-G-4…6`); CR-001 unchanged.

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `M12001-08-D1` | M12001-08 | `gueteklasse_code = min_rows(kulturen_tab7, klasse_code)` (rank 1 = A strictest ⇒ min) | register | Tab. 4 note (*) strictest; `gueteklasse_zugeordnet` (manual) derivation `m1200_1-D-2` |
| `M12001-07-D1` | M12001-07 | `restrisiko_max_code = max_rows(risiko_zeilen, restrisiko_code)` | register | §6.3.4; CR-014 onto `<= 2` ("niedrig") STAGED |
| `M12001-14-D1` | M12001-14 | `stoerfall_max_code = max_rows(stoerfaelle, risiko_code)` | register | Tab. 26 |
| `M12001-16-D1` | M12001-16 | `anwendungsbereich_count_calc = count_rows(flaechenverzeichnis)` | register | CR-015 |
| `M12001-16-D2` | M12001-16 | `zusatzwasserbedarf_jahr_calc = sum_rows(flaechenverzeichnis, menge_m3)` | register | §? demand sum (lift) |
| `M12001-09-D1` | M12001-09 | `compliance_quote_calc = count_rows(routineproben, ok == 1) * 100 / count_rows(routineproben)` | register | §5.2 "in mindestens 90 % der Proben" (100 = %) |
| `M12001-09-D2` | M12001-09 | `min_share_required = lookup('TAB8_PASS_SHARE', gueteklasse_zugeordnet, 'min_share_pct')` | `gueteklasse_zugeordnet` | note b) |

EQ-001 (existing Tab. 23 lookup) stays; the register makes it per-row (`m1200_1-R-1` records that EQ-001's scalar inputs are superseded).

- [ ] **Step 6: Emit + tests** (`m1200_1`, `20260917100500` / `…10` / `…20`). Render test: `risiko_zeilen` two rows, `ausgangsrisiko` filled from TAB23, `massnahmen` hidden below moderat.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `m1200-1-verify`; §5 wins 1 ✓ (class via rows; questionnaire mapping `J-1`), 2 ✓, 3 ✓, 4 ✓ (class-C E. coli cell residue), 5 ✓.

---

### Task 6: DWA-M-1200-3 — Schlag/Fläche rows with Karenzzeit, Emitterabstand and Tab. 7/8/9 factor → `min_abstand` per row; Tab. 11 limits switched by `pflanzentyp`; Tab. 3/13/14 storage + disinfection; Tagebuch rows

**Inputs:** inventory `…/inventory/DWA-M-1200-3.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-1200-3\DWA-M_1200-3_GD.md`; harness `tests/harness/m1200-3-verify.integration.test.ts`, `seed-m1200-3.ts`; prod: 25 worksheets, 208 fields (58 mirrored in M12003-05), 10 equation rows (5 distinct, duplicated), 39 requirements. Already on the mechanism: `bewaesserungstagebuch` (Plan-1 selection config, json) — this task REPLACES its config with the typed Tab. 2 columns (same symbol, `widget = 'register'` already; the new `ui_config` supersedes; prior captured for rollback).

**Estimated size:** tables 9 (TAB10 = the class table identical to 1200-1 Tab. 7 — NOT re-seeded: cross-standard reference `m1200_3-X-1`, the class chain reads `gueteklasse` here; TAB3 ≈3, TAB7/8/9 ≈ 6 rows (sprinkler group × class group × Spritzschutz → faktor), TAB11 ≈17 (with the (*) pairs as `salzempfindlich`/`salzunempfindlich` columns), TAB6 ≈6 × 3 pressure columns, TAB4 ≈2, TAB13 ≈6 methods × 4 moments, TAB14 ≈2, TAB5 ≈1 (example → `anhaltswert`, seeded as `S_TAB5_BEISPIEL` only for the Bewässerungshöhe default)) / registers 6 (`schlaege`, `speicher_1200_3`, `druckleitungen`, `wasseranalysen`, `desinfektionen`, `expositionspfade`) + `bewaesserungstagebuch` re-config / select_one 0 new / lookup_fill 3 (Tab. 11 limits by `pflanzentyp`; Tab. 14 dose by `desinfektion_methode`) / field `visible_when` 9 / section `visible_when` 1 (M12003-13 Abstände only for sprinkler methods) / equations 6 new + 2 staged (helper duplicates) / sign-off ≈ 10. Time saved (§5): ~20 hand-typed Abstand/Karenzzeit fields per Schlag; Tab. 11 limits switched; the 58-field mirror worksheet (Phase 6, `m1200_3-X-2`); CR-06 fixed to real enum tokens; Tagebuch typed.

**Files:** `regulation-tables-seed-m1200_3.ts`, `field-configs/m1200_3.ts` + prior, `equations/m1200_3.ts`, tests, `register-m1200-3-schlaege.test.tsx`, STAGED file, report; migrations `20260917100600` / `…10` / `…20`.

- [ ] **Step 1: Read.** Inventory; transcript l.659 (Tab. 3), l.724 (Tab. 4), l.794 (Tab. 5), l.838 (Tab. 6), l.926/941/1044 (Tab. 7/8/9) + §5.4.4 and §5.2.4.2 sentences, l.1210–1330 (Tab. 10), l.1352 (Tab. 11), l.1553 (Tab. 13), l.1738 (Tab. 14), Tab. 2 Tagebuch header, Tab. 12, Tab. 15, §7.2.4 (72 h / 50 %), §7.3.2 filters. Capture prior (note `speichertyp` enum tokens `offen_ortsfest_kurz…` — the CR-06 mismatch).

- [ ] **Step 2: Tables** (`standard_code 'DWA-M-1200-3'`):

| table_code | key_columns | value_columns | policy (cue) | rows |
|---|---|---|---|---|
| `TAB3` | `speichersystem` (geschlossen/offen/transport) | `klassen_zulaessig` (string, lifted "A, B" etc.), `allows_a`, `allows_b`, `allows_c`, `allows_d` (boolean; transport = "Nach Bedarf" → all true + note) | `anhaltswert` ("werden … empfohlen") | l.659 |
| `TAB789` | `tabelle` (t7/t8/t9), `klasse_group` (a_c/d), `spritzschutz` (ohne/mit) | `faktor` (number) | `anhaltswert` ("Empfohlene Abstandsregelung"; RMP decides) | l.926/941/1044 — the "(1-fache)" parenthesised cell → note; each (table, class group, Spritzschutz) as one row with the printed cell quoted |
| `TAB11` | `parameter` (kalium…zink) | `limit_salzempfindlich`, `limit_salzunempfindlich` (number; equal when no (*)), `unit`, `comparator`, `ph_min`/`ph_max` for the pH row (nullable) | `anhaltswert` ("Toleranzbereiche"; fallspezifisch for salzempfindlich) — split into `TAB11_<PARAM>` single-key tables keyed `pflanzentyp` for `lookup_fill` (G-12) | l.1352 |
| `TAB6` | `leitungstyp` (prod tokens, D-1) | `material_eur`, `einbau_eur`, `kwh_2bar`, `kwh_4bar`, `kwh_6bar` | `anhaltswert` ("schematischer Überblick … Beispiel") | l.838 |
| `TAB4` | `farbe` (purple_522c/purple_512c) | `hex`, `rgb`, `cmyk`, `hex_alt` (string) | `locked` | l.724 |
| `TAB13` | `methode` (chlorung/ozonung/pes/uf/uv/h2o2) × `speichertyp` (geschlossen/offen) — split into `TAB13_<MOMENT>` ×4 keyed `methode`,`speichertyp` → `allowed` (boolean) | `locked` ("Mögliche und zulässige Maßnahmen") | l.1553 |
| `TAB14` | `methode` (chlorung/h2o2) | `konzentration` (number), `konz_unit` (string), `verweilzeit_min_h`, `verweilzeit_max_h` | `anhaltswert` ("Empfohlene Konzentration") | l.1738 |
| `S_TAB5_BEISPIEL` | `groesse` (normgroesse) | `bewaesserungshoehe_mm` | `anhaltswert` ("Beispiel … als Orientierung") | l.794 |

- [ ] **Step 3: Registers / selections**

`schlaege` (M12003-06, **create**) → `register`:
```json
{ "title": "Schläge / bewässerte Flächen", "subtitle": "Tab. 2 Kopf + §5.4.4 / §5.6.1 — je Schlag Kultur, Technik und Abstände", "add_label": "+ Schlag",
  "columns": [
    { "key": "schlag_nr", "label": "Schlag-Nr.", "type": "text", "required": true },
    { "key": "feldblock", "label": "Feldblock", "type": "text" },
    { "key": "flaeche_ha", "label": "Fläche", "type": "number", "unit": "ha", "required": true, "min": 0 },
    { "key": "kultur", "label": "Kultur", "type": "text", "required": true },
    { "key": "pflanzentyp", "label": "Pflanzentyp", "type": "enum", "options": ["<prod pflanzentyp tokens>"], "required": true },
    { "key": "technik", "label": "Bewässerungstechnik", "type": "enum", "options": ["<prod bewaesserungsverfahren tokens>"], "required": true, "discriminator": true },
    { "key": "sprinkler_gruppe", "label": "Sprinklergruppe (Tab. 7/8/9)", "type": "enum", "options": ["t7", "t8", "t9"], "visible_when": "technik IN {<sprinkler tokens>}" },
    { "key": "wurfweite_m", "label": "Wurfweite", "type": "number", "unit": "m", "visible_when": "technik IN {<sprinkler tokens>}" },
    { "key": "spritzschutz", "label": "Spritzschutz", "type": "boolean", "visible_when": "technik IN {<sprinkler tokens>}" },
    { "key": "steuerbarer_zugang", "label": "steuerbarer Zugang", "type": "boolean", "visible_when": "sprinkler_gruppe == 't9'" },
    { "key": "faktor", "label": "Faktor", "type": "derived", "expr": "if(steuerbarer_zugang, 0, lookup('TAB789', sprinkler_gruppe, if(gueteklasse == 'D', 'd', 'a_c'), if(spritzschutz, 'mit', 'ohne'), 'faktor'))" },
    { "key": "min_abstand_m", "label": "Mindestabstand", "type": "derived", "expr": "faktor * wurfweite_m" },
    { "key": "abstand_ist_m", "label": "Abstand vorhanden", "type": "number", "unit": "m" },
    { "key": "abstand_ok", "label": "Abstand ≥ min", "type": "derived", "expr": "if(abstand_ist_m >= min_abstand_m, 1, 0)" },
    { "key": "weidegang_laktierend", "label": "laktierendes Vieh", "type": "boolean" }
  ] }
```
(`gueteklasse` is the worksheet's inherited class symbol — G-13 scope check; the "steuerbarer Zugang ⇒ Abstandsregelung entfällt" and the "Mikrosprüh ≤ 1 m Wurfhöhe kann entfallen" sentences are lifted; the second becomes `m1200_3-J-1` since "gegebenenfalls" leaves it open.)
`wasseranalysen` (M12003-08, **create**) → columns `date date required`, `parameter lookup_key TAB11 required`, `wert number required`, `limit derived expr "lookup('TAB11', parameter, if(pflanzentyp == '<salzempfindlich token>', 'limit_salzempfindlich', 'limit_salzunempfindlich'))"` — a column NAME chosen by `if()` is not supported (`lookup` takes the column as a string literal) → **G-14**: encode as two lookups `limit_se`, `limit_su` and `limit derived expr "if(pflanzentyp == '<se token>', limit_se, limit_su)"`; `ok derived`.
`speicher_1200_3` (M12003-10, **create**) → columns `label text`, `speichertyp enum [<prod tokens>] discriminator`, `speichersystem derived expr "lookup('TAB3_MAP', speichertyp, 'system')"` (a small map table from prod tokens to geschlossen/offen/transport — the CR-06 fix, `m1200_3-G-1`), `volumen_m3 number`, `o2_saettigung_pct number`, `verweilzeit_h number`, `belueftung boolean visible_when "verweilzeit_h >= 72"`, `umwaelzung boolean visible_when "verweilzeit_h >= 72"`, `klasse_ok derived expr "lookup('TAB3', speichersystem, if(gueteklasse == 'A', 'allows_a', …))"` → G-14 again → four lookups and an `if()` chain on `gueteklasse`.
`druckleitungen` (M12003-11, **create**) → `leitungstyp lookup_key TAB6`, `laenge_m number`, `arbeitsdruck enum [2, 4, 6]` (tokens; labels "2 bar"… lifted), `material lookup_value`, `einbau lookup_value`, `kwh derived expr "if(arbeitsdruck == '2', lookup('TAB6', leitungstyp, 'kwh_2bar'), if(arbeitsdruck == '4', lookup('TAB6', leitungstyp, 'kwh_4bar'), lookup('TAB6', leitungstyp, 'kwh_6bar')))"`, `volumenverlust_pct number`.
`desinfektionen` (M12003-22, **create**) → `date date`, `methode lookup_key TAB14` (only chlorung/h2o2 rows; thermal → separate fields stay), `konz_empf lookup_value`, `konz_ist number`, `verweilzeit_h number`, `moment enum [befuellung, speicherung, start, transport]`, `zulaessig derived expr "lookup('TAB13_<moment>…')"` → G-14 → four lookups + `if()` on `moment`.
`expositionspfade` (M12003-24, **create**) → `flaeche text`, `technik enum`, `pfad text` (Tab. 15 rows as datalist lifted), `massnahme text`.
`bewaesserungstagebuch` (existing register symbol) → new `ui_config` columns from Tab. 2: `start date required`, `ende date`, `empfehlung_mm number`, `gabe_mm number required`, `flaeche_ha number required`, `wasser_m3 number required`, `davon_aufbereitet_m3 number`, `kommentar text`.
Tab. 11 limits → `lookup_fill` role `limit` on created `cl_limit`, `haerte_limit`, `lf_limit` keyed `pflanzentyp` on `TAB11_CHLORID` etc.; Tab. 14 → `lookup_fill` role `value` on existing `chlorung_stoss_konz` / `h2o2_stoss_konz` keyed on a constant… (G-12: no literal keys) → keep the two as created single-row tables `TAB14_CHLORUNG`, `TAB14_H2O2` keyed `methode` with `from_symbol: 'desinfektion_methode'`.

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| all top-level sections of M12003-13 | `bewaesserungsverfahren IN {<sprinkler tokens>}` | §5.4.4 "relevant, wenn Sprinklersysteme … verwendet werden" |
| Karenzzeit fields (M12003-15) | `karenzzeit_klasse_c` etc.: `gueteklasse IN {'C-1', 'C-2'}`; `karenzzeit_klasse_d_*`: `gueteklasse == 'D'`; `karenzzeit_weide_laktierend`: `gueteklasse == 'B-1'` | Tab. 10 |
| `frostschutz_menge` (M12003-17) | `anwendungsbereich == '<frostschutz token>'` | CR-15 |
| `rueckflussverhinderer_vorhanden`, `systemtrenner_vorhanden`, `freier_auslauf` (M12003-12) | `wasserherkunft == '<hybrid token>'` | §5.1.5 (CR-08 guard STAGED `m1200_3-G-2`) |
| `chlorung_stoss_konz` / `h2o2_stoss_konz` / `temp_thermisch`+`dauer_thermisch_min` (M12003-22) | `desinfektion_methode == '<chlorung>'` / `'<h2o2>'` / `'<thermisch>'` | Tab. 14 / §7.2.5 |
| `abschaltung_automatisch` (M12003-11) | `druckabfall_unbeabsichtigt == true` | §5.1.6 |
| `kontrollfilter_120` (M12003-21) | `gueteklasse == 'A'` | §7.3.2 |

STAGED gates: CR-06/CR-06-2 tokens (`m1200_3-G-1`); CR-09 factor rule onto `count_rows(schlaege, abstand_ok == 0) == 0` (`m1200_3-G-3`); C-class laktierend exclusion `count_rows(schlaege, weidegang_laktierend AND gueteklasse IN {'C-1','C-2'}) == 0` (`m1200_3-G-4`); CR-05 Tab. 11 switch (`m1200_3-G-5`); 20 duplicate `CR-xx-2` rows (`m1200_3-G-6`).

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `M12003-06-D1` | M12003-06 | `flaeche_gesamt_ha = sum_rows(schlaege, flaeche_ha)` | register | Tab. 5 basis |
| `M12003-06-D2` | M12003-06 | `abstand_verletzungen = count_rows(schlaege, abstand_ok == 0)` | register | Tab. 7/8/9 |
| `M12003-10-D1` | M12003-10 | `speichervolumen_calc = bewaesserungshoehe * flaeche_gesamt_ha * 10` (10 = mm·ha→m³ printed in Tab. 5 arithmetic) | as named | Tab. 5 — existing Gl-Helper-1 uses the scalar `flaeche_groesse` → `m1200_3-R-1` |
| `M12003-18-D1` | M12003-18 | `wasserverbrauch_ist_m3 = sum_rows(bewaesserungstagebuch, wasser_m3)` | register | Tab. 2 |
| `M12003-18-D2` | M12003-18 | `schwermetall_fracht_pa = sum_rows(wasseranalysen, …)` — needs concentration × volume per period; the guideline's LAWA "ein Drittel" rule → `m1200_3-F-1` (formula text only) | — | CR-18-2 |
| `M12003-11-D1` | M12003-11 | `energie_kwh_a = sum_rows(druckleitungen, kwh * laenge_m / 1000)` (Tab. 6 assumes 1 000 m — printed) | register | Tab. 6 note |
| `M12003-08-D1` | M12003-08 | `analysen_verletzungen = count_rows(wasseranalysen, ok == 0)` | register | Tab. 11 |

Duplicate helper rows (5 equations twice) → `m1200_3-R-2` (deactivate the M12003-05 copies).

- [ ] **Step 6: Emit + tests** (`m1200_3`, `20260917100600` / `…10` / `…20`). Render test: `schlaege` two rows (sprinkler vs drip), sprinkler columns hidden for drip, `min_abstand_m` derived.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `m1200-3-verify`; §5 wins 1 ✓, 2 ✓ (fracht F-1), 3 Phase 6, 4 ✓ (G-14 workaround), 5 ✓.

---
### Task 7: FLL-GAR-2023 — `abdichtungs_art` master switch, Tab. 1 slope, Tab. 18 classes, concrete track (Tab. 6/7/8), seams (Tab. 22), PE (Tab. 25), bentonite (Tab. 13/16), protection layers (Tab. 26/27), Tab. 28 edge heights, sealing build-up rows

**Inputs:** inventory `…/inventory/FLL-GAR-2023.md`; transcript `C:\Users\Ekowai\Desktop\Supabase data\Guidelines knowledge markdown\FLL-Gewässerabdichtungsrichtlinien.md`; harness `tests/harness/fll-gar*.integration.test.ts` (fll-gar02…28, `fll-gar27-qnot`, `seed-fll-gar.ts`, `seed-fll-gar27.ts`, `fll-gar-snapshot.ts`, `_verify-fll-gar09`); prod: 29 worksheets, 174 fields, 4 equations, 30 requirements. FLL revision workstream (`feat/fll-revision`, 126 staged findings) is a separate decision batch — this task does not touch gate severities; every overlap is cross-referenced in the sign-off by finding id.

**Estimated size:** tables 14 (TAB1 ≈11, TAB4 ≈2, TAB5 ≈1, TAB6 ≈2, TAB7 ≈5, TAB8 ≈4 (2 Bauteile × 4 Ausführungsarten → 8 cells), TAB12 ≈3, TAB13 ≈4×2, TAB16 ≈2×2, TAB18 ≈3 W-rows + 4 R-rows + 2 S-rows (three tables), TAB22 ≈10, TAB24 ≈7, TAB25 ≈4, TAB26 ≈6 (alignment uncertain → partial), TAB27 ≈3, TAB28 ≈4×3; Tab. 2/3 → sign-off (garbled / requirement list)) / registers 7 (`abdichtungslagen`, `boeschungsabschnitte`, `randabschnitte`, `durchdringungen`, `pflanzenarten`, `naehte`, `einzugsflaechen_not`) + `pruefungen`, `wartungsmassnahmen` / select_one 4 created (`mineral_typ`, `mischgutart`, `baugrund_klasse_18196`, `swk_klasse`) / lookup_fill 12 / field `visible_when` ≈14 / section `visible_when` on FLL-GAR-10…21 (12 material worksheets) / equations 6 new + 2 staged (`g_prime` split, `A` duplicate) / sign-off ≈ 16. Time saved (§5): master selector shows one material worksheet and fills slope/thickness limits; Tab. 18 classes derived; concrete track filled; seams/PE/bentonite/coating filled; build-up as rows with Tab. 26/27 fills.

**Files:** `regulation-tables-seed-fll_gar.ts`, `field-configs/fll_gar.ts` + prior, `equations/fll_gar.ts`, tests, `register-fll-gar-lagen.test.tsx`, `scripts/verification/fll_gar-STAGED-plan3-rulings.sql`, report; migrations `20260917100700` / `…10` / `…20`.

- [ ] **Step 1: Read.** Inventory; transcript l.1394 (Tab. 1), l.1895/1921/2222 (Tab. 3/4/5), l.2437/2520/2570 (Tab. 6/7/8), l.2916 (Tab. 12), l.3106/3279 (Tab. 13/14/16), l.3670 (Tab. 18), l.4105 (Tab. 22 + overlap sentence), l.4466/4531 (Tab. 24/25), l.5345/5423 (Tab. 26/27), l.5735 (Tab. 28), §4.7 rhizome sentences (PEHD "kann verzichtet werden"; others "Nachweis … zu erbringen"), §6.1.1.2 mehrlagig, §6.2.1.2 Gartenteich 1,0 mm, §5.5.2.1 U ≥ 5 → ≤32 mm, §7.1.3.2 Verzinkung. Capture prior (12-value `abdichtungs_art` enum, D-1; note which worksheet code holds which material).

- [ ] **Step 2: Tables** (`standard_code 'FLL-GAR-2023'`):

| table_code | key_columns | value_columns | policy (cue) | rows |
|---|---|---|---|---|
| `TAB1` | `abdichtungs_art` (prod tokens — the 11 printed rows ↔ 12 prod values map recorded; unmapped rows/values → `fll_gar-E-1`) | `neigung_max_1m` (number, m of "1:m"), `gefaelle_max_pct` (number) | `anhaltswert` ("Die angegebenen Werte sind Richtwerte … entbinden nicht von einer rechnerischen Überprüfung") | l.1394 |
| `TAB4` | `mineral_typ` (natuerlich/industriell) | `abdichtung_min_cm`, `lagen_min`, `lage_min_cm`, `lage_max_cm`, `auflast_min_cm` | `anhaltswert` ("Abweichungen von 10% der vorgegebenen Schichtdicken sind zulässig") | l.1921 |
| `TAB5` | `typ` (verguetet) | same columns | same | l.2222 |
| `TAB6` | `dicke_band` (le40/gt40) | `wz_max`, `zement_min_kg_m3` (nullable for gt40 if not printed), `fck_min` (string) | `locked` | l.2437 |
| `TAB7` | `anwendungsfall` (prod `anwendungsfall_concrete` tokens, D-1) | `festigkeitsklasse` (string), `festigkeit_wechselzone` (string, footnote ¹), `expositionsklassen` (string), `feuchtigkeitsklasse` (string), `c_nom_mm` (number) | `locked` | l.2520 |
| `TAB8` | `bauteil` (prod `bauteil_type` tokens), `ausfuehrung` (prod `beton_ausfuehrungsart` tokens) | `dicke_min_mm` (number, nullable "–"), `fussnote` (string) | `locked` | l.2570 |
| `TAB12` | `mischgutart` (asphaltmastix/gussasphalt/asphaltbeton) | `dicke_min_mm`, `dicke_max_mm`, `dicke_mittel_mm` (nullable), `hohlraum_max_pct` (nullable, footnote ¹) | `locked` ("Nenndicken … einzuhalten") | l.2916 |
| `TAB13` | `bentonit_typ` (prod `bentonit_type` tokens na/ca) | `mclay_min_g_m2`, `wassergehalt_max_pct`, `quellvermoegen_min_ml`, `montmorillonit_min_mg_g` | `locked` | l.3106 |
| `TAB16` | `beschichtung` (ohne/mit), `funktion` (quellgegendruck/austrocknung_frost) — prod `gtd_polyolefin_beschichtung` × `gtd_auflast_funktion` tokens | `auflast_min_m` | `anhaltswert` ("Anhaltswerte"; "Bei Abweichungen … nutzungs- und …") | l.3279 |
| `TAB18_W` / `TAB18_R` / `TAB18_S` | `klasse` (w1b/w2b/w3b · r0b…r3b · s1b/s2b) | W: `fuellhoehe_max_m` (nullable for W3-B ">10"); R: `rissbreite_max_mm`, `rissversatz_max_mm`; S: `beschreibung` (string) | `locked` (classification) | l.3670 |
| `TAB22` | `fuegeverfahren` (prod tokens), `material` (prod `bahn_material_naht` tokens) | `nahtbreite_min_mm` | `locked` | l.4105; overlap ≥40/≥60 → `TAB22_UEBERLAPPUNG` keyed `polymerbitumen` (ohne/mit) |
| `TAB24` | `eigenschaft` (dichte/mfr/russgehalt/…) | `min`, `max`, `unit`, `norm` (string) | `locked` | l.4466 |
| `TAB25` | `beanspruchung` (prod `pe_beanspruchung_klasse` tokens) | `peld_min_mm`, `pehd_min_mm` (nullable), `beispiele` (string) | `anhaltswert` ("Kategorisierung … obliegt dem Objektplanenden") | l.4531 |
| `TAB26` | `baugrund` (DIN 18196 groups as printed row tokens) | `sand_min_cm` (nullable), `vlies_ok`, `bautenschutzmatte_ok`, `pe_granulat_ok`, `kunststoffbahn_ok`, `beton_ok` (boolean) | `locked` ("Andernfalls sind die in Tabelle 26 enthaltenen Werkstoffe …") | l.5345 — column alignment uncertain in the transcript: seed ONLY rows the executor can read unambiguously; the rest `fll_gar-U-1` (PDF confirmation path) |
| `TAB27` | `swk` (swk1/swk2/swk3) | `belastung_kn`, `nutzung` (string), `flaechengewicht_min_g_m2` | `locked` ("Mindestanforderungen") | l.5423 |
| `TAB28` | `hoehe_band` (ge15/ge10/ge5/zero), `anwendungsfall` (prod `abschluss_anwendungsfall` tokens) | `zulaessig` (enum: x / x_bedingt / sonder / nein), `fussnote` | `locked` ("gelten als Mindesthöhen"; ¹ "Nur als Sonderkonstruktion") | l.5735 |

Not seeded: Tab. 2 (rows garbled, `fll_gar-U-2`), Tab. 3 (a requirement list, not per-class values → attestation list `fll_gar-J-1`), Tab. 14 (geotextile — seed as `TAB14` if the executor reads it cleanly; optional), Tab. 9–11/15/17/19/20/21/23/29 not read by the inventory → `fll_gar-U-3` (scope note; Tab. 29 plant list → `pflanzenarten` datalist later).

- [ ] **Step 3: Registers / selections**

`abdichtungslagen` (FLL-GAR-09, **create**) → `register`:
```json
{ "title": "Abdichtungsaufbau (Lagen)", "subtitle": "Regelaufbau — Schutzlage unten, Abdichtung (ggf. mehrlagig), Schutzlage oben, Auflast", "add_label": "+ Lage",
  "columns": [
    { "key": "position", "label": "Position", "type": "number", "required": true, "min": 1 },
    { "key": "rolle", "label": "Rolle", "type": "enum", "options": ["schutzlage_unten", "abdichtung", "schutzlage_oben", "auflast"], "required": true, "discriminator": true },
    { "key": "material", "label": "Abdichtungsart (Tab. 1)", "type": "lookup_key", "lookup": { "table_code": "TAB1" }, "visible_when": "rolle == 'abdichtung'" },
    { "key": "dicke_mm", "label": "Dicke", "type": "number", "unit": "mm", "required": true, "min": 0 },
    { "key": "flaechengewicht_g_m2", "label": "Flächengewicht", "type": "number", "unit": "g/m²", "visible_when": "rolle IN {schutzlage_unten, schutzlage_oben}" },
    { "key": "baugrund", "label": "Baugrund DIN 18196 (Tab. 26)", "type": "lookup_key", "lookup": { "table_code": "TAB26" }, "visible_when": "rolle == 'schutzlage_unten'" },
    { "key": "sand_min_cm", "label": "Sand min (Tab. 26)", "type": "lookup_value", "lookup": { "table_code": "TAB26", "key_column": "baugrund", "value": "sand_min_cm" }, "visible_when": "rolle == 'schutzlage_unten'" },
    { "key": "swk", "label": "SWK (Tab. 27)", "type": "lookup_key", "lookup": { "table_code": "TAB27" }, "visible_when": "rolle == 'schutzlage_oben'" },
    { "key": "fg_min", "label": "Flächengewicht min (Tab. 27)", "type": "lookup_value", "lookup": { "table_code": "TAB27", "key_column": "swk", "value": "flaechengewicht_min_g_m2" }, "visible_when": "rolle == 'schutzlage_oben'" },
    { "key": "fg_ok", "label": "≥ min", "type": "derived", "expr": "if(rolle == 'schutzlage_oben', if(flaechengewicht_g_m2 >= fg_min, 1, 0), 1)" }
  ] }
```
`boeschungsabschnitte` (FLL-GAR-07, **create**) → `zone enum [sumpf, flach, tief]`, `neigung_1m number` (m of 1:m), `gefaelle_pct number`, `laenge_m number`, `limit_1m derived expr "lookup('TAB1', abdichtungs_art, 'neigung_max_1m')"` (`abdichtungs_art` worksheet symbol, G-13), `ok derived expr "if(neigung_1m >= limit_1m, 1, 0)"` (flatter = larger m).
`randabschnitte` (FLL-GAR-23, **create**) → `label text`, `anwendungsfall enum [<prod tokens>] discriminator`, `hoehe_cm number required`, `randbefestigung text`, `kapillarsperre boolean`, `hoehe_band derived expr "if(hoehe_cm >= 15, 'ge15', if(hoehe_cm >= 10, 'ge10', if(hoehe_cm >= 5, 'ge5', 'zero')))"` (band edges = printed row heads), `zulaessig derived expr "lookup('TAB28', hoehe_band, anwendungsfall, 'zulaessig')"`.
`naehte` (FLL-GAR-16, **create**) → `label text`, `fuegeverfahren enum [<prod tokens>]`, `material enum [<prod tokens>]`, `nahtbreite_ist_mm number`, `nahtbreite_min derived expr "lookup('TAB22', fuegeverfahren, material, 'nahtbreite_min_mm')"` (G-1), `ok derived`, `pruefergebnis text`.
`durchdringungen` (FLL-GAR-24, **create**) → `typ text`, `position text`, `fugenabdichtung text`, `rhizom_nachweis boolean`; `pflanzenarten` (FLL-GAR-24, **create**) → `art text` (datalist = Tab. 29 once read), `aggressiv boolean`; `einzugsflaechen_not` (FLL-GAR-27, **create**) → `label text`, `a_m2 number required`, `c number required`, `ac derived expr "a_m2 * c"`; `pruefungen` (FLL-GAR-25, **create**) → `typ enum [eignung, eigen, fremd, kontroll]`, `werkstoff text`, `datum date`, `zertifikat text`, `bestanden boolean`; `wartungsmassnahmen` (FLL-GAR-28, **create**) → `massnahme text`, `intervall_monate number`, `qualifikation text`.
Selectors **create**: `mineral_typ` (FLL-GAR-10, enum natuerlich/industriell, labels lifted Tab. 4), `mischgutart` (FLL-GAR-13, enum 3 rows Tab. 12), `baugrund_klasse_18196` (FLL-GAR-22, enum = TAB26 row tokens), `swk_klasse` (FLL-GAR-22, enum swk1–3), `bauteildicke_band` NOT created (derived from `bauteildicke_cm` inside the equation).
`lookup_fill` (role `limit` unless noted): FLL-GAR-07 `boeschungsneigung_limit` (create) ← TAB1 by `abdichtungs_art`; FLL-GAR-10 `schichtdicke_abdichtung_min` (create) ← TAB4 by `mineral_typ`, `schichtdicke_auflast_min` (create) ← TAB4; FLL-GAR-12 `festigkeitsklasse_soll`, `expositionsklassen_soll`, `feuchtigkeitsklasse_soll`, `c_nom_min` (create) ← TAB7 by `anwendungsfall_concrete`; `bauteildicke_min` (create) ← TAB8 by (`bauteil_type`, `beton_ausfuehrungsart`) — two keys allowed at field level; FLL-GAR-13 `asph_dicke_min` (create) ← TAB12 by `mischgutart`; FLL-GAR-14 `bentonit_flaecheneinheit_min`, `quellvermoegen_min` (create) ← TAB13 by `bentonit_type`; `gtd_auflast_min_m` (create) ← TAB16 by (`gtd_polyolefin_beschichtung`, `gtd_auflast_funktion`); FLL-GAR-18 `pe_nenndicke_min` (create) ← TAB25 by `pe_beanspruchung_klasse` (value column chosen by material: two fields `peld_min`, `pehd_min`); FLL-GAR-22 `sl_schutzlage_oben_flaechengewicht_min` (create) ← TAB27 by `swk_klasse`.

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| top-level sections of FLL-GAR-10…21 (each material worksheet) | `abdichtungs_art == '<its token>'` (worksheets holding two materials: `IN {…}`) | §5–7 structure; REQ-12…22 already guard by `abdichtungs_art` |
| `wassereinwirkungsklasse`, `rissklasse`, `standortklasse` (FLL-GAR-05) | `abdichtungs_art IN {bahn_bitumen, bahn_kunststoff_elastomer, fluessigkunststoff, bahn_pe}` | Tab. 18 scope (REQ-05) |
| `wurzel_rhizomfestigkeit_required` | stays; derived flag `rhizome_required_code = if(abdichtungs_art == '<pehd token>', 0, 1)` (§4.7 "Auf eine Prüfung … kann verzichtet werden" vs "Nachweis … zu erbringen") | §4.7 |
| `anzahl_lagen` ≥ 2 | `abdichtungs_art == 'bahn_bitumen'` (REQ-17 exists) | §6.1.1.2 |
| `naht_ueberlappung_kunststoff_mm` limit | `lookup_fill` ← `TAB22_UEBERLAPPUNG` by `polymerbitumen_beschichtung` | §6.2.2.1 |
| `groesstkorn_auflast_mm` ≤32 vs ≤16 | STAGED gate on created `ungleichfoermigkeit_u` (`fll_gar-G-1`) | §5.5.2.1 |
| `bahnendicke_mm` ≥1,0 (Gartenteich) | STAGED gate (`fll_gar-G-2`, needs `gewaesser_type` token) | §6.2.1.2 |
| `verzinkung_dicke_um` (FLL-GAR-19) | `stahl_typ == '<unlegiert token>'` | §7.1.3.2 |
| `eisbildung` edge protection (REQ-06 empty) | STAGED (`fll_gar-G-3`) | §4.4 |

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `FLL-GAR-05-D1` | -05 | `w_klasse_code = if(fuellhoehe_m <= 5, 1, if(fuellhoehe_m <= 10, 2, 3))` (5/10 printed) | `fuellhoehe_m` | Tab. 18; `wassereinwirkungsklasse` (manual) `fll_gar-D-1` |
| `FLL-GAR-05-D2` | -05 | `r_klasse_code = if(rissbreite_erwartet_mm <= 0.2, 1, if(rissbreite_erwartet_mm <= 0.5, 2, 3))` — needs `rissbreite_erwartet_mm` (create number) and R0-B "keine Neurissbildung" as a separate boolean → `fll_gar-J-2` | — | Tab. 18 |
| `FLL-GAR-12-D1` | -12 | `wz_max = lookup('TAB6', if(bauteildicke_cm <= 40, 'le40', 'gt40'), 'wz_max')` | `bauteildicke_cm` | Tab. 6 (REQ-14 onto it STAGED) |
| `FLL-GAR-09-D1` | -09 | `lagen_gesamtdicke_mm = sum_rows(abdichtungslagen, if(rolle == 'abdichtung', dicke_mm, 0))`; `abdichtungslagen_count = count_rows(abdichtungslagen, rolle == 'abdichtung')` | register | §6.1.1.2 |
| `FLL-GAR-27-D1` | -27 | `sum_ac = sum_rows(einzugsflaechen_not, a_m2 * c)` | register | Anhang 1 Gl. 1 — rewriting `Q_NOT` onto `sum_ac` = `fll_gar-R-1` (DIN 1986-100 r values are `reference`, content boundary) |
| `FLL-GAR-23-D1` | -23 | `randabschnitte_unzulaessig = count_rows(randabschnitte, zulaessig == 'nein')` | register | Tab. 28 (REQ-23 onto it STAGED `fll_gar-G-4`) |
| `FLL-GAR-16-D1` | -16 | `naht_verletzungen = count_rows(naehte, ok == 0)` | register | Tab. 22 |
| `FLL-GAR-02-D1` | -02 | `gewaesser_in_scope_code = if(gewaesser_type IN {<the four out-of-scope tokens>}, 0, 1)` | `gewaesser_type` | §1.1 (typed boolean → `fll_gar-D-2`) |

STAGED: `g_prime` double-defined → split into `g_prime` and `g_prime_required` (`fll_gar-R-2`); `A` vs `A_einzugsflaeche` duplicate (`fll_gar-X-1`); the slope stored three ways (`fll_gar-X-2`); thickness symbols per material (`fll_gar-X-3`) — these overlap the FLL-revision batch; cite its finding ids.

- [ ] **Step 6: Emit + tests** (`fll_gar`, `20260917100700` / `…10` / `…20`). Render test: `abdichtungslagen` two rows (schutzlage_unten with baugrund fill; abdichtung with material), discriminator-driven columns.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness: the whole `fll-gar*` set + `seed-fll-gar-smoke`; §5 wins 1 ✓, 2 ✓ (R-class partial), 3 ✓, 4 ✓, 5 ✓ (Tab. 26 partial).

---

### Task 8: FLL-Naturteich — `natural_pool_type` master selector, filter/hydrobotanical units as rows with Tab. 10–12 limits, zones as rows, dated water analyses with Tab. 7/8 targets, plant plan rows

**Inputs:** inventory `…/inventory/FLL-Naturteich.md`; transcript `C:\Users\Ekowai\Desktop\Supabase data\Guidelines knowledge markdown\FLL-Guidelines natural pool.md` (secondary `FLL-Naturteich-2017_pdftotext.txt` for Table 1 column repair — cite both); harness `tests/harness/verify-fll-naturteich-fllnt01…15.integration.test.ts`, `fllnt02/11/12-verify`, `seed-fll-naturteich.ts`, `seed-fll-naturteich.smoke`; prod: 15 worksheets, 130 fields, 6 equations, 33 requirements. Already on the mechanism: `equipment_elements_list`, `plant_species_list` (Plan-1 selection configs, `20260911120000_selection_configs_FLL_Naturteich.sql`) — `plant_species_list` is re-configured below (same symbol), `equipment_elements_list` untouched.

**Estimated size:** tables 8 (TABLE1 ≈5 types × features, TABLE7 ≈10, TABLE8 ≈9 (+ type split for P rows), TABLE9 ≈6 × 3, TABLE10 ≈4 × 2, TABLE11 ≈8, TABLE12 ≈8, TABLE15 ≈9, S10_4_3 ≈3) / registers 5 (`zonen`, `filtereinheiten`, `wasserproben`, `ueberlaufeinrichtungen`, `plant_species_list` re-config) / select_one 1 created (`substrate_role`) / lookup_fill 10 / field `visible_when` 7 / section `visible_when` FLLNT-09, -10 by type / equations 7 new + 2 staged (EQ-04/05 semantics) / sign-off ≈ 10. Time saved (§5): type fills share minimum, flow type, P flag, Tab. 8 P limits and hides non-applicable worksheets; filter rows with Tab. 10/11/12 limits and Tab. 15 surface; zones with totals; analyses with inline targets; plant counts.

**Files:** `regulation-tables-seed-fll_naturteich.ts`, `field-configs/fll_naturteich.ts` + prior, `equations/fll_naturteich.ts`, tests, `register-fllnt-filtereinheiten.test.tsx`, STAGED, report; migrations `20260917100800` / `…10` / `…20`.

- [ ] **Step 1: Read.** Inventory; transcript l.1103–1220 (Table 1; reassemble columns with the txt), l.1308–1660 (Tables 2–6 per type — read for the share minima of IV/V), l.1904/1938 (Table 7/8), l.2028 (Table 9), l.2587 (Table 10), l.2666/2788 (Table 11/12), l.3049 (§10.4.3), l.4110 (Table 15), §10.3.1 overflow sentences (rigid → reservoir ≥150 l/m²; ±2/±1 mm), §10.2.5. Capture prior (`natural_pool_type` tokens type_I…type_V; `filter_flow_type`, `filter_flow_direction`, `hydrobot_type` tokens).

- [ ] **Step 2: Tables** (`standard_code 'FLL-Naturteich'`):

| table_code | key_columns | value_columns | policy (cue) | rows |
|---|---|---|---|---|
| `TABLE1` | `pool_type` (prod tokens) | `regeneration_share_min_pct` (number, nullable for IV/V → `TABLE5/6` refs as string `share_ref`), `flow_type` (string: none/slow/quick/system), `p_binding_required` (boolean), `filter_operation` (string), `regeneration_technique` (string) | `locked` (type definition) | l.1103–1220; Table 2 "> 50% therefrom at least half submerged" → `TABLE2_TYPE1` single row |
| `TABLE7` | `parameter` | `min`, `max`, `unit`, `comparator` | `anhaltswert` ("If the analysis results deviate from the approximate values, the biological processes must be observed …") — split per parameter into `TABLE7_<PARAM>` keyed `source` (single row, key `all`) — G-12 | l.1904 |
| `TABLE8_<PARAM>` | `type_group` (i_iii / iv_v) — only P_total and orthophosphate vary; other params one row `all` | `limit`, `comparator`, `unit` | `anhaltswert` | l.1938 |
| `TABLE9` | `substrate_role` (filter_iii/filter_iv/plant) | `grain_max_mm`, `oversize_max_pct`, `fines_max_pct`, `kf_min`, `frost_resistance_required` (boolean), `elutable_p_max` — nullable for "no requirement" | `locked` ("must") | l.2028 |
| `TABLE10` | `hydrobot_type` (prod tokens) | `water_column_min_cm`, `water_column_max_cm`, `substrate_min_cm`, `substrate_max_cm`, `grain_max_mm`, `feed_rate_qmax` | `locked` | l.2587 |
| `TABLE11` / `TABLE12` | `flow_direction` (prod `filter_flow_direction` tokens) | `water_column_min_cm` (nullable), `layer_min_cm`, `grain_max_mm`, `oversize_max_pct`, `fines_max_pct`, `kf_min`, `tolerance_pct`, `feed_rate_qmax` (T11) / `feed_rate_qmin` (T12), `individual_verification` (boolean for horizontal) | `locked` | l.2666/2788 |
| `TABLE15` | `grain_class` (4_6 … 22_32) | `pore_water_pct`, `surface_m2_m3` | `anhaltswert` ("determined using dolomite gravel … depends on its composition") | l.4110 |
| `S10_4_3` | `plant_group` (submerged/marsh_small/marsh_medium/lilies) | `density_min`, `density_max` (per m², nullable for lilies), `pot_size` (string) | `anhaltswert` ("approximate value") | l.3049 |

- [ ] **Step 3: Registers / selections**

`zonen` (FLLNT-06, **create**) → `register` columns `label text required`, `zone enum [swimming, regeneration, supplementary] required`, `area_m2 number required min 0`, `depth_m number`, `ground_area_m2 number`, `wall_area_m2 number`, `technique text visible_when "zone == 'regeneration'"`.
`filtereinheiten` (FLLNT-10, **create**) → `register`:
```json
{ "title": "Filter- / Hydrobotanik-Einheiten", "subtitle": "Tab. 10 / 11 / 12 — je Einheit Technik, Fließrichtung, Fläche, Schicht und Kornklasse (Tab. 15)", "add_label": "+ Einheit",
  "columns": [
    { "key": "label", "label": "Einheit", "type": "text", "required": true },
    { "key": "unit_kind", "label": "Art", "type": "enum", "options": ["hydrobotanical", "substrate_filter", "technical"], "required": true, "discriminator": true },
    { "key": "hydrobot_type", "label": "Hydrobotanik-Typ", "type": "lookup_key", "lookup": { "table_code": "TABLE10" }, "visible_when": "unit_kind == 'hydrobotanical'" },
    { "key": "flow_type", "label": "Durchströmung", "type": "enum", "options": ["<prod filter_flow_type tokens>"], "visible_when": "unit_kind == 'substrate_filter'" },
    { "key": "flow_direction", "label": "Fließrichtung", "type": "enum", "options": ["<prod filter_flow_direction tokens>"], "visible_when": "unit_kind == 'substrate_filter'" },
    { "key": "area_m2", "label": "F_filter", "type": "number", "unit": "m²", "required": true, "min": 0 },
    { "key": "layer_cm", "label": "wirksame Schicht", "type": "number", "unit": "cm", "visible_when": "unit_kind != 'technical'" },
    { "key": "layer_min", "label": "Schicht min (Tab.)", "type": "derived", "expr": "if(unit_kind == 'hydrobotanical', lookup('TABLE10', hydrobot_type, 'substrate_min_cm'), if(flow_type == '<slow token>', lookup('TABLE11', flow_direction, 'layer_min_cm'), lookup('TABLE12', flow_direction, 'layer_min_cm')))" },
    { "key": "grain_class", "label": "Kornklasse (Tab. 15)", "type": "lookup_key", "lookup": { "table_code": "TABLE15" }, "visible_when": "unit_kind == 'substrate_filter'" },
    { "key": "surface_m2_m3", "label": "Oberfläche", "type": "lookup_value", "lookup": { "table_code": "TABLE15", "key_column": "grain_class", "value": "surface_m2_m3" }, "visible_when": "unit_kind == 'substrate_filter'" },
    { "key": "colonized_m2", "label": "besiedelbare Oberfläche", "type": "derived", "expr": "surface_m2_m3 * area_m2 * layer_cm / 100" },
    { "key": "feed_rate", "label": "Beschickung", "type": "number", "unit": "m³/(m²·d)" },
    { "key": "feed_limit", "label": "Beschickung Grenze", "type": "derived", "expr": "if(unit_kind == 'hydrobotanical', lookup('TABLE10', hydrobot_type, 'feed_rate_qmax'), if(flow_type == '<slow token>', lookup('TABLE11', flow_direction, 'feed_rate_qmax'), lookup('TABLE12', flow_direction, 'feed_rate_qmin')))" }
  ] }
```
(the `/ 100` is cm→m, structural; EQ-02's printed form is lifted into the config quote.)
`wasserproben` (FLLNT-04, **create**) → `date date required`, `location enum [fill, swimming] required discriminator`, ten parameter columns `number`, per-parameter limit `derived` columns choosing TABLE7 vs TABLE8 by `location` and type group by `natural_pool_type` (`if(natural_pool_type IN {'type_IV','type_V'}, 'iv_v', 'i_iii')`), `ok_*` derived.
`ueberlaufeinrichtungen` (FLLNT-11, **create**) → `type enum [rigid, flexible]`, `edge_length_m number`, `tolerance_mm number`, `tol_limit derived expr "if(edge_length_m <= 1, 1, 2)"` (±1/±2 printed §10.3.1).
`plant_species_list` (existing json register; new `ui_config`) → `species text required`, `plant_group lookup_key S10_4_3 required`, `area_m2 number required`, `density_min lookup_value`, `density_max lookup_value`, `density number required`, `count derived expr "area_m2 * density"`.
`substrate_role` (FLLNT-05, **create** enum = TABLE9 keys) → `select_one`; TABLE9 limits → `lookup_fill` role `limit` on existing `filter_grain_size_max`, `filter_substrate_oversize_pct`, `filter_substrate_elutriated_pct`, `filter_kf`, `filter_substrate_elutable_p` keyed `substrate_role` (their VR strings today mix slow/quick — the fields become the limit carriers; the measured values need created `*_ist` fields → `fllnt-S-1`, keep both in the sign-off).
`natural_pool_type` → `lookup_fill` role `limit` on created `regeneration_share_min_pct` (FLLNT-03) ← TABLE1; `filter_flow_type` (existing enum) derivation from type → `fllnt-D-1` (manual today).

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| top-level sections of FLLNT-10 (substrate filter) | `natural_pool_type IN {'type_III', 'type_IV'}` | Table 1 "no filter" for I/II; V technical |
| top-level sections of FLLNT-09 (hydrobotanical) | `natural_pool_type IN {'type_I', 'type_II', 'type_III'}` | Table 1 regeneration area column |
| `p_binding_required` | `natural_pool_type == 'type_III'` | Table 1 |
| `splash_water_tank_volume` | `rigid_overflow_used == true` | §10.3.1 (REQ-33 exists) |
| `filter_water_column`, `filter_kf` "individual verification" | `filter_flow_direction != '<horizontal token>'` | Tables 11/12 |
| `grain_specific_surface` (typed scalar) | stays; derivation from Tab. 15 per row (`fllnt-D-2`) | — |
| `drainage_*` (FLLNT-07) | `groundwater_level IS NOT NULL` | §9.1 (attest today) |

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `FLLNT-06-D1` | -06 | `total_pool_area_calc = sum_rows(zonen, area_m2)` | register | VR "computed" (no equation today) |
| `FLLNT-06-D2` | -06 | `regeneration_share_calc = sum_rows(zonen, if(zone == 'regeneration', area_m2, 0)) * 100 / total_pool_area_calc` | register | Table 1 share; REQ-07 onto it STAGED `fllnt-G-1` |
| `FLLNT-06-D3` | -06 | `pool_underwater_surface_calc = sum_rows(zonen, ground_area_m2 + wall_area_m2)` | register | EQ-PUWS replacement `fllnt-R-1` |
| `FLLNT-10-D1` | -10 | `filter_colonized_surface_total = sum_rows(filtereinheiten, colonized_m2)` | register | EQ-02 replacement `fllnt-R-2`; EQ-01 50×-rule onto it `fllnt-G-2` |
| `FLLNT-10-D2` | -10 | `filter_feed_violations = count_rows(filtereinheiten, feed_rate > feed_limit)` — quick filters need `>=` min: `if(flow_type == '<quick>', feed_rate < feed_limit, feed_rate > feed_limit)` | register | Tables 10/11/12 |
| `FLLNT-11-D1` | -11 | `overflow_edge_length_total = sum_rows(ueberlaufeinrichtungen, edge_length_m)` | register | EQ-04 (0,01 × swimming area — the guide value stays as an equation, but its OUTPUT must not be the input field → `fllnt-R-3`) |
| `FLLNT-12-D1` | -12 | `plant_count_total = sum_rows(plant_species_list, area_m2 * density)` | register | §10.4.3 |
| `FLLNT-04-D1` | -04 | `sample_violations = count_rows(wasserproben, <OR over ok_* == 0>)` | register | Tables 7/8 |

STAGED: EQ-05 uses `pool_underwater_surface` where the text says "inundated water surface" (`fllnt-R-4`, quote); orphan fields `type_III`, `submergent`, … (`fllnt-S-2` deactivation); `swimming_area_m2` twice (`fllnt-X-1`).

- [ ] **Step 6: Emit + tests** (`fll_naturteich`, `20260917100800` / `…10` / `…20`). Render test: `filtereinheiten` two rows (hydrobotanical vs substrate), TABLE15 fill, `colonized_m2`.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness: all `verify-fll-naturteich-fllnt*` + `fllnt02/11/12-verify` + smoke; §5 wins 1 ✓, 2 ✓, 3 ✓, 4 ✓, 5 ✓.

---

### Task 9: DWA-M-820-3 — item-level QE checklists (174 printed items, ten catalogues) with counts and percentages derived; Anhang-A/B gating on `project_type`; Projektstopp derived

**Inputs:** inventory `…/inventory/DWA-M-820-3.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-3\DWA-M_820-3.md` (l.685–1180 hold all ten catalogues); harness `tests/harness/m820-3-verify.integration.test.ts`, `seed-m820-3.ts`; prod: 24 worksheets, 250 fields, 0 equations, 32 requirements. Already on the mechanism: `applicable_lph` (Plan-1 config; I-1 pending pair — untouched).

**Estimated size:** tables 10 catalogues (`A1` 15, `A2` 8, `A3` 12, `A4` 3, `B1` 15, `B2` 40, `B3` 50, `B4` 34, `B5` 10, `B6` 6 rows — the printed counts the inventory states; the pin asserts them after counting) / registers 12 (one per QE worksheet: M8203-07…-18; B.2 and B.3 are split across two worksheets each — one register per worksheet, each keyed to the same catalogue with `count_rows` asserting the split range) / select_one 0 (drivers exist: `project_type`, `applicable_lph`) / lookup_fill 0 / field `visible_when` 4 / section `visible_when` M8203-04…-10 (Anhang A) and -11…-18 (Anhang B) / equations 12 × 5 (y/p/n/na counts + total) + 2 annex totals + 1 Projektstopp flag = ≈ 63 small equations — generated programmatically in the equations module from one template, NOT hand-written 63 times / sign-off ≈ 8 (fulfilment formula and verdict bands are NOT printed → owner ruling `m820_3-F-1`, the % equations below only encode `count / total × 100` for each rating separately). Time saved (§5): ~100 hand-typed numbers removed; Einzelprojekte not blocked by Anhang-A gates; Projektstopp derived.

**Files:** `regulation-tables-seed-m820_3.ts`, `field-configs/m820_3.ts` + prior, `equations/m820_3.ts`, tests, `register-m820-3-qe.test.tsx`, STAGED, report; migrations `20260917100900` / `…10` / `…20`.

- [ ] **Step 1: Read.** Transcript l.685–1180 completely (all ten catalogues, each `Nr. | Qualitätselemente/-kriterien | Hinweise`); Vorwort/§1 "projektspezifisch ausgewählt und ergänzt"; Bild 1 split sentence; "Werden Phasenziele nicht … erreicht, ist die Prüfung eines Projektstopps erforderlich"; the per-worksheet `qeNN_items_total` VR strings in prior (to map worksheet ↔ catalogue ↔ item range).

- [ ] **Step 2: Tables** (`standard_code 'DWA-M-820-3'`; ten tables `QE_A1`, `QE_A2`, `QE_A3`, `QE_A4`, `QE_B1`, `QE_B2`, `QE_B3`, `QE_B4`, `QE_B5`, `QE_B6`): `key_columns ['nr']` (the printed Nr. as token `n1`…), `value_columns [{ name: 'kriterium', type: 'string' }, { name: 'hinweise', type: 'string' }, { name: 'nr_num', type: 'number' }]`, `override_policy 'anhaltswert'` (cue: "Dabei stellen die angegebenen Qualitätselemente nur eine projektübergeordnete Auswahl an Kriterien dar, die im Anwendungsfall projektspezifisch ausgewählt und ergänzt werden müssen."), every row's `verbatim_quote` = the printed row (Nr. + Kriterium + Hinweise). A.4's three categories (Ökonomie/Ökologie/Sozioökonomie) are rows with `group_label`. Status `md_verified` when all rows lift cleanly. Pin: row counts 15/8/12/3/15/40/50/34/10/6 (assert after counting; a mismatch with the prod `qeNN_items_total` VR is `m820_3-U-1`).

- [ ] **Step 3: Registers** — one per QE worksheet, template (M8203-07 shown; the module generates the twelve from `[{ ws, table, from, to }]`):
```json
{ "title": "Qualitätselemente — Anhang A.1 (QE 5.2 Bedarfsplanung Konzept)", "subtitle": "je gedrucktem Kriterium eine Zeile — Bewertung Y / P / N / NA mit Nachweis", "add_label": "+ Kriterium",
  "columns": [
    { "key": "nr", "label": "Nr.", "type": "lookup_key", "required": true, "lookup": { "table_code": "QE_A1" } },
    { "key": "kriterium", "label": "Kriterium", "type": "lookup_value", "lookup": { "table_code": "QE_A1", "key_column": "nr", "value": "kriterium" } },
    { "key": "hinweise", "label": "Hinweise", "type": "lookup_value", "lookup": { "table_code": "QE_A1", "key_column": "nr", "value": "hinweise" } },
    { "key": "rating", "label": "Bewertung", "type": "enum", "options": ["y", "p", "n", "na"], "required": true },
    { "key": "evidence", "label": "Nachweis", "type": "text" },
    { "key": "remark", "label": "Bemerkung", "type": "text" }
  ],
  "note": "G-2: Zeilen werden aus dem Katalog gewählt (seed_from_table folgt in Plan 2b); Vollständigkeit = count_rows == Anzahl gedruckter Kriterien" }
```
For B.2 (M8203-12/-13) and B.3 (M8203-14/-15) the register on each worksheet binds the same table; completeness uses `count_rows(reg, nr_num >= <from> AND nr_num <= <to>)` where from/to are the printed item ranges recorded in prod VR (lifted from the catalogue numbering, not invented). `project_type` (existing enum) stays the driver. Phasenziele stay enums. `sector_*`, `bild1_step_*`, `anw_hinweis_*` boolean sets → `select_many` on created json fields `sektoren`, `bild1_schritte`, `anwendungshinweise` with `enum_values` = the printed sentences (`m820_3-J-1` keeps the booleans until ratified — the created fields are additive).

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| top-level sections of M8203-04…-10 | `project_type IN {'gesamtsystem', 'beide'}` (prod tokens) | Bild 1 split; "Auf der Grundlage des Konzepts für das Gesamtsystem wurden erforderliche Projekte identifiziert" |
| top-level sections of M8203-11…-18 | `project_type IN {'einzelprojekt', 'beide'}` | same |
| M8203-12/-13 (B.2) | additionally `contains(applicable_lph, …)` — `applicable_lph` is `select_many` → NOT encodable per rule; sign-off `m820_3-M-1` proposes the `contains()` form for ratification | "gegliedert nach … Leistungsphasen" |
| `projektstopp_review_triggered` | stays visible; equation below | Vorwort sentence |
| BIM block (M8203-19) | `bim_project_definition_complete == true` | §7.2.2 (REQ-25) |

STAGED: REQ-06/07/08 guarded `IF project_type IN {gesamtsystem, beide}`; REQ-09…14 `IF project_type IN {einzelprojekt, beide}` (`m820_3-G-1/2`); REQ-15…24 onto the count equations (`m820_3-G-3`); REQ-31 onto `projektstopp_code` (`m820_3-G-4`); REQ-02/03/05/27/29 empty conditions (`m820_3-G-5`, propose from the checklists).

- [ ] **Step 5: Derived** (generated: for each `{ ws, reg, table, from, to }`):
```
<ws>-D1  items_y  = count_rows(<reg>, rating == 'y')
<ws>-D2  items_p  = count_rows(<reg>, rating == 'p')
<ws>-D3  items_n  = count_rows(<reg>, rating == 'n')
<ws>-D4  items_na = count_rows(<reg>, rating == 'na')
<ws>-D5  items_rated = count_rows(<reg>)
```
output symbols = the existing `qeNN_items_y/p/n/na` symbols where they exist (their fields become derived — `m820_3-D-1` lists the 48) else `qeNN_items_rated`. `qeNN_fulfilment_pct`: the P-weight and NA treatment are not printed → NOT an equation here; `m820_3-F-1` carries the two candidate formulas (`y/(total−na)` and `(y+0.5p)/(total−na)`) as text for the owner. Annex totals: `M8203-22-D1 gesamt_anhang_a_items_rated = qe07_items_rated + qe08_items_rated + qe09_items_rated + qe10_items_rated` (symbols per prior), `M8203-23-D1` likewise for B. `M8203-24-D1 projektstopp_code = if(<OR over every pz_*_status == 'nicht_erreicht' token>, 1, 0)` — the list of `pz_*` symbols read from prior.

- [ ] **Step 6: Emit + tests** (`m820_3`, `20260917100900` / `…10` / `…20`). Render test: QE_A1 register with two rows, `kriterium` fills from `nr`.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `m820-3-verify`; §5 wins 1 ✓ (counts; % pending F-1), 2 ✓ sections / gates STAGED, 3 ✓, 4 F-1, 5 Phase 6 (`m820_3-X-1`).

---
### Task 10: DIN-18130-1 — readings table → k per reading → k_T → k_10; α derived; Tab. 1 class derived; `gefaelle_typ` switch; Tab. 5 soil filter; u_0 from S_r (Tab. 3); Versuchsklasse from Tab. 4

**Inputs:** inventory `…/inventory/DIN-18130-1.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-18130-1\DIN-18130-1.md`; harness `tests/harness/din18130-verify.integration.test.ts`, `seed-din18130-1.ts`; prod: 5 worksheets, 54 fields, 8 equations, 7 requirements.

**Estimated size:** tables 5 (TAB1 5 rows, TAB2 5, TAB3 3, TAB4 4, TAB5 ≈10 rows — merged cells → seed only unambiguous rows, rest `din18130_1-U-1`) / registers 3 (`ablesungen`, `versuche`, `pflichtangaben` checklist as `select_many`) / select_one 2 created (`bodenart_tab5`, `bindig_grobkoernig`) / lookup_fill 4 (`u_0` ← TAB3 by `s_r_band` created; `A_min` ← S5_8 by `bindig_grobkoernig`; `versuchsklasse` ← TAB4 by (`saettigung_aufgebracht`, `stroemung_stationaer`); `durchlaessigkeitsbereich` ← TAB1 by derived band code — G-6/G-9: encoded as equation `bereich_code`) / field `visible_when` 8 / section 0 / equations 6 new + 2 staged (Gl. 8/9 switch; `alpha` input retirement) / sign-off ≈ 8. Time saved (§5): readings as rows with fitted k; α/k_T/k_10/class/Bezeichnung derived; Tab. 5 filter; gefaelle switch; u_0 fill.

**Files:** `regulation-tables-seed-din18130_1.ts`, `field-configs/din18130_1.ts` + prior, `equations/din18130_1.ts`, tests, `register-din18130-ablesungen.test.tsx`, STAGED, report; migrations `20260917101000` / `…10` / `…20`.

- [ ] **Step 1: Read.** Transcript L199–212 (Tab. 1), L223 (Bezeichnung pattern), L246 (three runs), L305–327 (Gl. 6 + Tab. 2), L335–336 (§5.8), L379, L416–442, L456–467, L477–487 (Tab. 4), L526, L530–559 (Tab. 5), L565, L627–642, L727, L772, L797–806 (§8.1 h variants), L832–848 (§8.4 report items), L934 (Ausgleichungsrechnung), L1132–1133, L1326, L1357.

- [ ] **Step 2: Tables** (`standard_code 'DIN-18130-1'`):

| table_code | key_columns | value_columns | policy (cue) | rows |
|---|---|---|---|---|
| `TAB1` | `bereich_code` (1…5 as tokens `b1`…`b5`, caption order) | `bereich` (string, lifted), `k_lower` (number, nullable), `k_upper` (number, nullable) | `locked` ("Für bautechnische Zwecke werden fünf Durchlässigkeitsbereiche definiert") | L199–212 |
| `TAB2` | `t_c` (5/10/15/20/25 as tokens) | `alpha` | `anhaltswert` ("Zwischenwerte können geradlinig eingeschaltet werden") — Gl. 6 gives the closed form, so TAB2 is display/pin only | L316–325 |
| `TAB3` | `s_r_band` (ge095/e090/e085) | `u_0_kn_m2` | `locked` (three discrete rows — SR-2: in-between values undefined → the band is a `select_one`) | L421–432 |
| `TAB4` | `saettigung` (ja/nein), `stationaer` (ja/nein) | `versuchsklasse` (string: prod `versuchsklasse` tokens 1a/1b/2/3), `fussnote` (string, 1b "*)") | `locked` | L477–487 |
| `TAB5` | `bodenart` (ton_schluff/feinsand/mittel_grobsand/sand_kies/sand_ton/kies_sand_ton), `anordnung` (kd/zy/tx) | `erreichbare_klasse` (string), `geeignet` (enum x/x_bedingt/nein), `gefaelle_*`, `volumen_*` (enum), `sb` (enum), `u_0` (enum) | `anhaltswert` (suitability "X geeignet, (X) bedingt geeignet, – nicht geeignet") | L530–559 — merged cells: every row the executor cannot map cell-by-cell is left out (`din18130_1-U-1`, SR-3 PDF path) |
| `S5_8` | `bodenklasse` (bindig/grobkoernig) | `a_min_cm2`, `groesstkorn_verhaeltnis` (string "1:5"/"1:10" by `ungleichfoermig` — second table `S5_8_KORN` keyed `gleichfoermigkeit`) | `anhaltswert` ("sollte … nicht unterschreiten") | L335–336 |

- [ ] **Step 3: Registers / selections**

`ablesungen` (DIN-18130-1-03, **create**) → `register`:
```json
{ "title": "Ablesungen", "subtitle": "§8.1/§8.2 — je Messintervall eine Zeile; Versuchsende bei annähernd gleichbleibendem k (L526)", "add_label": "+ Ablesung",
  "columns": [
    { "key": "nr", "label": "Nr.", "type": "number", "required": true, "min": 1 },
    { "key": "t_s", "label": "t", "type": "number", "unit": "s", "required": true, "min": 0 },
    { "key": "h_o", "label": "h_o", "type": "number", "unit": "m", "visible_when": "gefaelle_typ == '<konstant token>'" },
    { "key": "h_u", "label": "h_u", "type": "number", "unit": "m", "visible_when": "gefaelle_typ == '<konstant token>'" },
    { "key": "p_o", "label": "p_o", "type": "number", "unit": "kN/m²", "visible_when": "gefaelle_typ == '<konstant token>'" },
    { "key": "p_u", "label": "p_u", "type": "number", "unit": "kN/m²", "visible_when": "gefaelle_typ == '<konstant token>'" },
    { "key": "v_w", "label": "V_w", "type": "number", "unit": "m³", "visible_when": "gefaelle_typ == '<konstant token>'" },
    { "key": "h_1", "label": "h_1", "type": "number", "unit": "m", "visible_when": "gefaelle_typ == '<veraenderlich token>'" },
    { "key": "h_2", "label": "h_2", "type": "number", "unit": "m", "visible_when": "gefaelle_typ == '<veraenderlich token>'" },
    { "key": "t_c", "label": "T", "type": "number", "unit": "°C", "required": true },
    { "key": "h", "label": "h", "type": "derived", "expr": "h_o - h_u + (p_o - p_u) / gamma_w" },
    { "key": "k_row", "label": "k (Ablesung)", "type": "derived", "expr": "if(gefaelle_typ == '<konstant token>', v_w * l / (A * h * t_s), a * l_0 / (A * t_s) * ln(h_1 / h_2))" },
    { "key": "alpha_row", "label": "α", "type": "derived", "expr": "<Gl. 6 closed form lifted from L305 — written by the executor exactly as printed>" },
    { "key": "k10_row", "label": "k_10", "type": "derived", "expr": "k_row * alpha_row" }
  ] }
```
(`gefaelle_typ`, `gamma_w`, `l`, `l_0`, `A`, `a` are worksheet symbols read in row scope — G-13; the Gl. 8/9 forms are the printed formulas L797–806, lifted into the config quote; the Tab. 11 pressure variant L1326 is the `h` expression.)
`versuche` (DIN-18130-1-04, **create**) → `run number required`, `e number`, `n_pore derived expr "e / (1 + e)"` (identity printed via Tab. 6 values — quote), `rho_d number`, `s_r number`, `k_10_run number required` (or derived from that run's readings — Phase 6 nested registers, `din18130_1-F-1`).
`pflichtangaben` (DIN-18130-1-05, **create** json) → `select_many` with `enum_values` = the 14 §8.4 items lifted (L833–848), `ui_config { title: 'Pflichtangaben §8.4', groups: [{ label: 'Angaben zum Versuch', options: [...] }, { label: 'Angaben zur Probe', options: [...] }] }`.
`bodenart_tab5` (DIN-18130-1-01, **create** enum = TAB5 bodenart tokens, labels lifted) → `select_one`; `bindig_grobkoernig` (**create** enum) → `select_one`; `s_r_band` (**create** enum = TAB3 keys) → `select_one` (SR-2); `stroemung_stationaer` (**create** boolean) → `attestation` (label = Tab. 4 column head; footnote *) for 1b lifted as note).
`lookup_fill`: `u_0` (existing number) ← TAB3 by `s_r_band` (role `value`); `A_min` (create number, cm²) ← S5_8 by `bindig_grobkoernig` (role `limit`, gate `A >= A_min` STAGED `din18130_1-G-1`); `versuchsklasse` (existing enum, keep_prod) ← TAB4 by (`saettigung_aufgebracht`, `stroemung_stationaer`) — two boolean keys; TAB4 key tokens `ja`/`nein` ↔ boolean `true`/`false`: `makeTableLookup` stringifies keys (`String(true)` = "true") → seed TAB4 keys as `true`/`false` tokens (documented in the builder) — G-15 note.

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| `h`, `l`, `Q` (-03/-04) | `gefaelle_typ == '<konstant>'` | §8.1 |
| `a`, `l_0`, `h_1`, `h_2`, `i_bereich` (-03/-05) | `gefaelle_typ == '<veraenderlich>'` | §8.2, L832 |
| `u_0`, `s_r_band`, `saettigung_aufgebracht` | `versuchsklasse IN {'1a', '1b'}` — circular with the TAB4 fill → keep `saettigung_aufgebracht` always visible; `u_0`/`s_r_band` `visible_when saettigung_aufgebracht == true` | L416 |
| `statische_belastung` | `stroemungsrichtung == '<unten_nach_oben token>' OR saettigung_aufgebracht == true` | L442 |
| TX-specific (`filterstein_k`) / KD-specific (`probe_d_min`) | `versuchsanordnung == '<tx>'` / `'<kd>'` | L642 / L456 |
| `alpha` (input) | stays visible; equation below makes it derived (`din18130_1-D-1`) | L305 |

STAGED: Gl. 8 vs Gl. 9 both writing `k` → one switching equation `k_switch` (below) and retirement of the pair (`din18130_1-R-1`); CR-04 proxy `V_w > 0 AND t > 0` for stationary flow → onto `stroemung_stationaer` (`din18130_1-G-2`); `T < 40` VR not from source (`din18130_1-G-3`).

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `DIN-18130-1-04-D1` | -04 | `alpha_calc = <Gl. 6 closed form as printed>` | `T` | L305 (Gl. 6); pin: evaluates to the TAB2 values at 5/10/15/20/25 °C within the printed precision |
| `DIN-18130-1-04-D2` | -04 | `k_T_mean = mean_rows(ablesungen, k_row)` | register | L526/L1357 (mean of the last readings — "annähernd gleichbleibend": which readings enter the mean is a ruling `din18130_1-J-1`; default all rows) |
| `DIN-18130-1-04-D3` | -04 | `k_10_calc = k_T_mean * alpha_calc` | both | Gl. 6 |
| `DIN-18130-1-04-D4` | -04 | `k_switch = if(gefaelle_typ == '<konstant>', Q * l / (A * h), a * l_0 / (A * t) * ln(h_1 / h_2))` | as named | Gl. 8/9 (`din18130_1-R-1`) |
| `DIN-18130-1-01-D1` | -01 | `bereich_code = if(k_10 < <TAB1 b1 upper>, 1, if(k_10 <= <b2 upper>, 2, if(k_10 <= <b3 upper>, 3, if(k_10 <= <b4 upper>, 4, 5))))` — the four thresholds are the printed Tab. 1 bounds, lifted into `verification_quote`; alternatively `lookup()` cannot band a number (G-6), hence the `if()` chain | `k_10` | Tab. 1; `durchlaessigkeitsbereich` (manual enum) reversed → `din18130_1-D-2` |
| `DIN-18130-1-04-D5` | -04 | `k_10_runs_mean = mean_rows(versuche, k_10_run)` | register | L1132–1133 (three runs) |
| `DIN-18130-1-05-D1` | -05 | `pflichtangaben_count = count_rows(…)` — `select_many` is not a register; completeness via `contains()` per item in a gate (STAGED `din18130_1-G-4`) | — | §8.4 |

Cross-standard: `k_f` → DWA-A-138-1 A138-05 (`din18130_1-X-1`, with `permeability_test_method` = Laborverfahren ungestört → A138 TAB11 `f_methode`).

- [ ] **Step 6: Emit + tests** (`din18130_1`, `20260917101000` / `…10` / `…20`). Render test: `ablesungen` two rows, konstant vs veränderlich columns, `k_row`.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `din18130-verify`; §5 wins 1 ✓, 2 ✓ (Bezeichnung string → `din18130_1-F-2`, no string concat in the language), 3 partially (TAB5 partial), 4 ✓, 5 ✓.

---

### Task 11: DWA-M-205 — `behandlungsziel` + class selectors fill the Leitorganismus target table (Tabelle 1/2/3); `verfahren` arms only the chosen process branch; Tabelle 4 lamp properties; ozone/chlorine blocks; sample rows → log reduction

**Inputs:** inventory `…/inventory/DWA-M-205.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-205\DWA-M_205.md`; harness `tests/harness/m205-verify.integration.test.ts`, `seed-m205.ts`; prod: 26 worksheets, 237 fields, 24 equation rows (≈9 unique, 8 range checks), 82 requirements. M-205 single-source worktree `_wt-m205` (`feat/m205-singlesource`) exists — check `git log feat/m205-singlesource` for overlapping symbols before creating fields; cite in `m205-X-1`.

**Estimated size:** tables 8 (TABELLE1 ≈5, TABELLE2 ≈4 (2 water types × 2 params × 3 categories → 12 cells as rows), TABELLE3 ≈4, TABELLE4 ≈7 × 2, TABELLE5 ≈3, TABELLE6 ≈4, TABELLE7 ≈9, TABELLE8 ≈8 × 3; text tables `S4_3_3_2` ozone energy, `S4_4_2` chlorine) / registers 6 (`leitorganismen`, `proben_desinfektion`, `bestrahlungsgerinne`, `membranmodule`, `ozongeneratoren`, `chlorungsmittel`) / select_one 1 created (`percentile_typ` not needed — comes with the table row) / lookup_fill 8 (Tabelle 4 lamp properties by `strahlertyp`, Tabelle 2/3 limits) / field `visible_when` 12 / section `visible_when` on M205-10…13 (UV), -14/-15 (Membran), -16…-20 (Ozon), -21 (Chlor), -22 (PES), -23 (H2O2) by `verfahren` / equations 8 new + 8 staged (range-check "equations" demoted; EQ-05 constant; Eq. 3/4 mirror) / sign-off ≈ 14. Time saved (§5): 14 hard-coded mutually contradictory CR gates replaced by one target table; process switch; lamp/ozone/chlorine blocks filled; ≈95 duplicates (Phase 6); real derivations registered.

**Files:** `regulation-tables-seed-m205.ts`, `field-configs/m205.ts` + prior, `equations/m205.ts`, tests, `register-m205-leitorganismen.test.tsx`, STAGED, report; migrations `20260917101100` / `…10` / `…20`.

- [ ] **Step 1: Read.** Transcript Tabelle 1–8 (the inventory's verbatim block gives the locations; read the surrounding captions/footnotes), §2.1 authority sentence, §3.2 "Gesamtcoliforme weggefallen", §4.1.2.3 dose bands, §4.3.2 ct ×500, §4.3.3.2 ozone/O2, §4.3.3.3, §4.3.3.4 Verbrennung, §4.4.2 chlorine/ClO2, §4.4.3/4.4.4, §5 Tabelle 8. Capture prior (enums: `eg_badegewaesser_richtlinie`, `gewaessertyp`, `guetekategorie`, `eignungsklasse_bewaesserung`, `strahlertyp`, `verfahren`, `chlormittel_typ`, `ozon_einsatzgas`, `verbrennung_typ`, `nutzung`, `behandlungsziel`).

- [ ] **Step 2: Tables** (`standard_code 'DWA-M-205'`):

| table_code | key_columns | value_columns | policy (cue) | rows |
|---|---|---|---|---|
| `TABELLE1` | `parameter` (gesamtcoliforme/faekalcoliforme/strep_faecalis/salmonellen/darmviren) | `g_wert` (number, nullable), `g_pct` (number), `i_wert` (number, nullable), `i_pct` (number), `volume_ml` (number), `auf_anforderung` (boolean "*)") | `anhaltswert` (§2.1 "Die Festlegung des Behandlungsziels … erfolgt in der Regel durch die zuständige Behörde") | Tabelle 1 |
| `TABELLE2` | `gewaessertyp` (prod tokens binnen/kueste), `parameter` (enterokokken/e_coli), `guetekategorie` (prod tokens) | `limit_cfu_100ml`, `percentile_pct`, `methode` (string) | `anhaltswert` (same §2.1) | Tabelle 2 (12 rows) |
| `TABELLE3` | `eignungsklasse` (prod tokens 1–4) | `fkstrep_text`, `e_coli_text`, `toc_text` (string, lifted incl. footnotes), `fkstrep_max`, `e_coli_max`, `toc_max` (number, nullable — "nicht nachweisbar"/">400" → null + text), `anwendung` (string) | `anhaltswert` (Fn 4 "Richtwert, der … unterschritten werden sollte") | Tabelle 3 |
| `TABELLE4` | `strahlertyp` (prod tokens nieder/mitteldruck) | `hg_druck_hpa` (string range), `wellenlaenge_nm` (string), `leistung_w` (string), `leistungsdichte_w_cm` (string), `uvc_anteil_pct` (string), `oberflaechentemp_c` (string), `nutzungsdauer_h` (string) — ranges kept as printed strings + `_min`/`_max` numeric pairs | `anhaltswert` ("Typische…", figawa; manufacturer data) | Tabelle 4 |
| `S4_1_2_3` | `zielband` (prod `uv_dosis_zielband` tokens) | `dosis_min_j_m2`, `dosis_max_j_m2` | `anhaltswert` ("kann … auch höher liegen") | §4.1.2.3 |
| `TABELLE5` | `anlage` (straubing/rottenburg/ruhleben) | `typ`, `porengroesse_um`, `verfahrensart`, `netto_flux`, `druck_min`, `druck_max`, `energie_kwh_m3`, `kosten_eur_m3` | `anhaltswert` (reference plants) | Tabelle 5 |
| `TABELLE6` / `TABELLE7` | `nr` | `konzentration`, `kontaktzeit_min`, `parameter`, `ergebnis` (strings + numbers) | `anhaltswert` (reference studies) | Tabelle 6/7 |
| `TABELLE8` | `aspekt` × `verfahren` (uv/membran/ozon) — split into `TABELLE8_<VERFAHREN>` keyed `aspekt` | `bewertung` (enum +/o/−), `text` | `anhaltswert` ("Überblick") | Tabelle 8 |
| `S4_3_3_2` | `einsatzgas` (prod `ozon_einsatzgas` tokens) | `spez_energie_kwh_kg`, `o2_pro_o3_kg`, `o3_anteil_min_pct`, `o3_anteil_max_pct` | `anhaltswert` ("etwa", "ca.") | §4.3.3.2 |
| `S4_4_2` | `chlormittel` (prod `chlormittel_typ` tokens) | `dosis_min`, `dosis_max`, `dosis_unit`, `dosis_sandfiltriert_min/max`, `kontaktzeit_min`, `kontaktzeit_max`, `explosiv_ab_vol_pct` | `anhaltswert` ("Je nach dem Gehalt an organischen Stoffen … sind 1 mg bis 20 mg …") | §4.4.2 |
| `S4_3_3_4` | `verbrennung_typ` (prod tokens) | `temp_min_c`, `temp_max_c`, `haltezeit_min_s` | `locked` | §4.3.3.4 |

- [ ] **Step 3: Registers / selections**

`leitorganismen` (M205-10, **create**) → `register`:
```json
{ "title": "Leitorganismen / Zielwerte", "subtitle": "Tabelle 1 / 2 / 3 — je Organismus Grenzwert, Perzentil und Methode aus der gewählten Zieltabelle", "add_label": "+ Organismus",
  "columns": [
    { "key": "quelle", "label": "Zieltabelle", "type": "enum", "options": ["t1", "t2", "t3", "behoerde"], "required": true, "discriminator": true },
    { "key": "parameter_t1", "label": "Parameter (Tab. 1)", "type": "lookup_key", "lookup": { "table_code": "TABELLE1" }, "visible_when": "quelle == 't1'" },
    { "key": "limit_t1", "label": "I-Wert", "type": "lookup_value", "lookup": { "table_code": "TABELLE1", "key_column": "parameter_t1", "value": "i_wert" }, "visible_when": "quelle == 't1'" },
    { "key": "pct_t1", "label": "Perzentil", "type": "lookup_value", "lookup": { "table_code": "TABELLE1", "key_column": "parameter_t1", "value": "i_pct" }, "visible_when": "quelle == 't1'" },
    { "key": "parameter_t2", "label": "Parameter (Tab. 2)", "type": "enum", "options": ["enterokokken", "e_coli"], "visible_when": "quelle == 't2'" },
    { "key": "limit_t2", "label": "Grenzwert", "type": "derived", "expr": "lookup('TABELLE2', gewaessertyp, parameter_t2, guetekategorie, 'limit_cfu_100ml')", "visible_when": "quelle == 't2'" },
    { "key": "pct_t2", "label": "Perzentil", "type": "derived", "expr": "lookup('TABELLE2', gewaessertyp, parameter_t2, guetekategorie, 'percentile_pct')", "visible_when": "quelle == 't2'" },
    { "key": "parameter_t3", "label": "Parameter (Tab. 3)", "type": "enum", "options": ["fkstrep", "e_coli", "toc"], "visible_when": "quelle == 't3'" },
    { "key": "limit_t3", "label": "Grenzwert", "type": "derived", "expr": "if(parameter_t3 == 'fkstrep', lookup('TABELLE3', eignungsklasse_bewaesserung, 'fkstrep_max'), if(parameter_t3 == 'e_coli', lookup('TABELLE3', eignungsklasse_bewaesserung, 'e_coli_max'), lookup('TABELLE3', eignungsklasse_bewaesserung, 'toc_max')))", "visible_when": "quelle == 't3'" },
    { "key": "limit_behoerde", "label": "behördlicher Wert", "type": "number", "visible_when": "quelle == 'behoerde'" },
    { "key": "limit", "label": "Zielwert", "type": "derived", "expr": "if(quelle == 't1', limit_t1, if(quelle == 't2', limit_t2, if(quelle == 't3', limit_t3, limit_behoerde)))" },
    { "key": "messwert", "label": "Ablaufwert", "type": "number" },
    { "key": "ok", "label": "eingehalten", "type": "derived", "expr": "if(messwert <= limit, 1, 0)" }
  ] }
```
(`gewaessertyp`, `guetekategorie`, `eignungsklasse_bewaesserung` are worksheet/inherited symbols — G-13; the 3-key `lookup` on TABELLE2 is G-1.)
`proben_desinfektion` (M205-24, **create**) → `date date required`, `organismus text`, `c_in number required`, `c_out number required`, `log_red derived expr "log10(c_in / c_out)"`, `limit number`, `ok derived`.
`bestrahlungsgerinne` (M205-11, **create**) → `label text`, `q_m3_h number required`, `sensoren number min 1`, `zuschaltbar boolean`. `membranmodule` (M205-14, **create**) → `label text`, `verfahren enum [mf, uf]`, `porenweite_um number`, `flaeche_m2 number required`, `netto_flux number required`, `tmd number`. `ozongeneratoren` (M205-17, **create**) → `label text`, `kapazitaet_kg_h number required`, `spannung_kv number`, `frequenz_hz number`. `chlorungsmittel` (M205-21, **create**) → `mittel enum [<prod chlormittel_typ tokens>] discriminator`, `dosis number`, `dosis_min derived expr "lookup('S4_4_2', mittel, 'dosis_min')"`, `dosis_max derived`, `kontaktzeit_min_ist number`, `restchlor number visible_when "mittel != '<clo2 token>'"`.
`lookup_fill` (role `value`, `anhaltswert` with `override` where the field exists): Tabelle 4 → existing `strahler_quecksilberdampfdruck`, `strahler_wellenlaenge`, `strahler_leistungsdichte`, `uvc_anteil`, `strahler_oberflaechentemperatur`, `strahler_nutzungsdauer` keyed `strahlertyp` (numeric `_min` columns; the range strings shown as note — the executor picks the `_min`/`_max` pair per field and records it); `uv_dosis_min`/`uv_dosis_max` (create) ← S4_1_2_3 by `uv_dosis_zielband` (role `limit`, CR-07 STAGED); `spez_energie_ozon` (existing) ← S4_3_3_2 by `ozon_einsatzgas` (EQ-05 constant → `m205-R-1`); `temperatur_ozonentfernung_min`, `verbrennung_haltezeit_min` (create) ← S4_3_3_4 by `verbrennung_typ` (role `limit`).

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| top-level sections of M205-10…-13 | `verfahren == '<uv token>'` | §4/§5 branches |
| M205-14/-15 | `verfahren == '<membran>'` | |
| M205-16…-20 | `verfahren == '<ozon>'` | |
| M205-21 / -22 / -23 | `verfahren == '<chlorung>'` / `'<paa>'` / `'<h2o2>'` | |
| Tabelle-1 fields on M205-04 (`gesamtcoliforme_ablauf`, …) | `eg_badegewaesser_richtlinie == '<alt token>'` | §3.2 "Der Parameter „Gesamtcoliforme" ist weggefallen" |
| Tabelle-2 fields | `eg_badegewaesser_richtlinie == '<neu token>'` | |
| M205-05 Tabelle-3 fields | `behandlungsziel == '<bewaesserung token>'` | §3.3 |
| `clo2_*` vs `freies_chlor`/`kontaktzeit_chlor`/`entchlorungsstufe` (M205-21) | `chlormittel_typ == '<clo2>'` / `!= '<clo2>'` | §4.4.2 |
| `verbrennung_haltezeit_s` | `verbrennung_typ == '<thermisch>'` | §4.3.3.4 |
| `mehrstrassige_anlage` | stays; CR-28 exists | |
| `bromat_bildung`, `ozon_pro_doc` | `bromid > 0` | §4.3.3.3 (CR-21 guard STAGED) |
| `wiederverkeimungsbeurteilung` | `brauchwasser_standzeit_h > 0` | §3.5 (CR-31 STAGED) |

STAGED gate rewrites (one block each, quoting): CR-03/04/05/14/15/16/17 (+`-2`) → one `count_rows(leitorganismen, ok == 0) == 0` (`m205-G-1`); process gates CR-07…12, 21–24, 26, 28, 29, 34–36 guarded by `verfahren` (`m205-G-2`); CR-20 `log_reduktion` target by `nutzung` (6–7 vs 3–4 — `m205-G-3`, both sentences quoted); 30 `-2` duplicates (`m205-G-4`).

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `M205-10-D1` | -10 | `leitorganismen_verletzungen = count_rows(leitorganismen, ok == 0)` | register | Tabelle 1/2/3 |
| `M205-24-D1` | -24 | `log_reduktion_mean = mean_rows(proben_desinfektion, log_red)`; `log_reduktion_min = min_rows(…)` | register | §3 (percentile rule → G-3 `m205-F-1`) |
| `M205-17-D1` | -17 | `ozon_pro_doc_calc = ozon_konz / doc` | as named | §4.3.3.3 (EQ-04 rule → `m205-R-2`) |
| `M205-17-D2` | -17 | `ozonbedarf_kg_h = ozon_konz * durchfluss_max / 1000`; `o2_bedarf_kg_h = ozonbedarf_kg_h * lookup('S4_3_3_2', ozon_einsatzgas, 'o2_pro_o3_kg')` | as named | §4.3.3.2 |
| `M205-17-D3` | -17 | `ozon_kapazitaet_sum = sum_rows(ozongeneratoren, kapazitaet_kg_h)` | register | — |
| `M205-14-D1` | -14 | `membranflaeche_sum = sum_rows(membranmodule, flaeche_m2)`; `permeat_design = sum_rows(membranmodule, flaeche_m2 * netto_flux)` | register | §4.2 |
| `M205-11-D1` | -11 | `durchfluss_gerinne_sum = sum_rows(bestrahlungsgerinne, q_m3_h)`; `gerinne_count = count_rows(bestrahlungsgerinne)` | register | §4.1 (>1000 m³/h rule; CR-28) |
| `M205-10-D2` | -10 | `verweildauer_calc = V_reaktor / Q` — needs `V_reaktor` (create number) — `m205-F-2` if the text does not print the relation | — | §4.1 |
| `M205-17-D4` | -17 | `ct_ziel = if(ct_wert_zielorganismus == '<cryptosporidien token>', ct_ecoli_basis * 500, ct_ecoli_basis)` — 500 printed "Fünfhundertfache"; `ct_ecoli_basis` (create) | as named | §4.3.2 |

Demotions (STAGED `m205-R-3`): EQ-02/04/06/07/09/10/11/12 are validation rules, not equations — proposed `UPDATE equations SET …`? No — proposal = deactivate rows + create `validation_rules`; commented SQL only. KVR cost per m³ (`kosten_*_cent_m3`) → `m205-F-3` (needs interest/duration parameters the text gives as 25 a / 12,5 a only).

- [ ] **Step 6: Emit + tests** (`m205`, `20260917101100` / `…10` / `…20`). Render test: `leitorganismen` rows t1 vs t2, discriminator columns, `limit`.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `m205-verify`; §5 wins 1 ✓ (gate rewrite STAGED), 2 ✓, 3 ✓, 4 Phase 6 (`m205-X-2` lists the four mis-titled worksheets), 5 ✓ (+F-1/F-3).

---

### Task 12: DWA-M-187 — `sonderanwendung` (+ P/Spurenstoffe variants) as branch switch with per-variant `h_FK`/`q_Dr_RBF` limits; Bild 3 layer stack; Teilfilterbecken/Segmente; Klein-RBF carbonate toggle; A-178 inheritance recorded

**Inputs:** inventory `…/inventory/DWA-M-187.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-187\DWA-M_187_GD.md`; harness `tests/harness/m187-verify.integration.test.ts`, `seed-m187.ts`; prod: 25 worksheets, 139 fields (7 empty worksheets), 4 equations (2 unique), 21 requirements.

**Estimated size:** tables 6 text-limit tables (`S5_VARIANT_LIMITS` keyed by `sonderanwendung` × `variante` → `h_fk_min_m`, `q_dr_rbf_l_s_m2`, `q_dr_comparator`; `S5_1_3_1_P` (a/b/c parameters); `S5_2_3_1_SPUR` (a/b/c/d); `BILD3` layer stack ≈4 rows; `S5_4_3_ORG` (organic-load constants); `S5_5_KLEIN` (Klein-RBF values with/without carbonate); Tabelle 3 qualitative; Tabelle 4/5 Klimakennung → `TABELLE4`, `TABELLE5` seeded, no field target (`m187-J-1`)) / registers 5 (`filterschichten` (Bild 3), `teilfilterbecken`, `filtersegmente`, `sorptionsstufen`, `klein_rbf_elemente`, `indikatororganismen`) / select_one 1 created (`daten_vorhanden` for the 750 m²/ha vs ≤20 g switch) / lookup_fill 4 (`h_FK_min`, `q_Dr_RBF_limit` created, by (`sonderanwendung`, variant) — two keys at field level OK) / field `visible_when` 10 / section `visible_when` on M187-05…-10, -11…-15, -16…-18, -19/-20, -21/-22 by `sonderanwendung` / equations 6 new + 1 staged (Gl. 1 on the wrong worksheet) / sign-off ≈ 12 (incl. the "0,2 m mit Carbonatschicht" prod claim NOT found in the transcript — `m187-U-1`; REQ-02/03/04/05/06 contradictions). Time saved (§5): three contradictory REQs stop firing on every project; A-178 base by reference (Phase 6 `m187-X-1`); ~55 copies (Phase 6 `m187-X-2`); layer stack summing to `h_FK`; carbonate toggle; A_F < 1 % allowed via Gl. 2.

**Files:** `regulation-tables-seed-m187.ts`, `field-configs/m187.ts` + prior, `equations/m187.ts`, tests, `register-m187-schichten.test.tsx`, STAGED, report; migrations `20260917101200` / `…10` / `…20`.

- [ ] **Step 1: Read.** Transcript §5.1.3.1 a/b/c, §5.1.3.2, §5.2.3.1 a–d + Bild 3, §5.3.3.1/§5.3.3.5, §5.4.3, §5.4.4, §5.4.2.2.2, §5.5.3.2.2 (h_FK ≥ 0,25 verbatim; search for "0,2" near "Carbonat"), §5.5.4, Tabelle 2 units, Tabelle 3, Tabelle 4/5. Capture prior (`sonderanwendung` 5 tokens, `verfahrensvariante_p` a/b/c, `verfahrensvariante_spurenstoffe` a–d, `carbonatschicht_vorhanden`, `uv_eingesetzt`, `betriebsmodus`, `filtervegetation`).

- [ ] **Step 2: Tables** (`standard_code 'DWA-M-187'`; text-limit tables: each row = one printed sentence, `verbatim_quote` = that sentence):

| table_code | key_columns | value_columns | policy (cue) | rows |
|---|---|---|---|---|
| `S5_LIMITS` | `sonderanwendung` (prod tokens), `variante` (prod variant tokens or `-`) | `h_fk_min_m` (nullable), `q_dr_rbf` (nullable), `q_dr_comparator` (string "=" / "≤"), `h_fk_carbonat_m` (nullable — ONLY if the transcript prints it, else null + `m187-U-1`) | `locked` for "ist … begrenzt"/"≥" sentences; `anhaltswert` where "sollte" (P-Rückhalt a beta "kann … angesetzt werden … zu optimieren") — per row `override_quote` | §5.1.3.1, §5.2.3.1, §5.3.3.1, §5.5.3.2.2 |
| `S5_1_3_1_P` | `variante` (a/b/c) | `beta_min`, `s_po4p_am`, `fe_massenanteil_pct`, `fe_gehalt_min_pct`, `p_grund_beladung_max`, `feinmassenanteil_max_pct`, `fallhoehe_max_m`, `ebct_min_min`, `v_filter_auf_max`, `v_filter_ab_max`, `h_fk_ss_m`, `sorptionsstufen_min` (all nullable) | mixed (per row quote) | §5.1.3.1/2 |
| `S5_2_3_1_SPUR` | `variante` (a/b/c/d) | `q_dr_rbf`, `q_dr_comparator`, `h_fk_min_m`, `beschickungsdauer_max_h`, `trockenzeit_h`, `segmente_min` | `locked` (d: "keine allgemein gültigen Bemessungsvorgaben" → row with nulls + note) | §5.2.3.1 |
| `BILD3` | `lage` (1…4, top-down) | `dicke_cm`, `material` (string), `gak_vol_min_pct`, `gak_vol_max_pct`, `caco3_massenanteil_pct` (nullable) | `locked` | Bild 3 |
| `S5_4_3_ORG` | `parameter` (q_krit/q_a_max/v_vorstufe_min/b_csb_max/a_f_pro_aeb/foerderleistung/beschickung_pro_ereignis/austritt_max/teilfilter_multiple/wirkungsgrad) | `wert` (number), `unit`, `modal` (string "muss"/"sollte"/"empfohlen") | per row `locked`/`anhaltswert` by `modal` | §5.4.3/§5.4.4 |
| `S5_5_KLEIN` | `parameter` (a_f_anteil/h_rr_min/h_rbf_min/h_draen_min/deckschicht/caco3_filter_min/caco3_carbo/h_fk_caco3_min/h_fk_min/draen_dn_min/eta_afs63_min) | `wert`, `unit` | `locked` (§5.5.4 A_F < 1,0 % allowed with Gl. 2 proof → `override_quote`, policy `kann` for that row) | §5.5.3.2.2/§5.5.4 |
| `TABELLE3` | `kriterium` × `variante` | `text` | `anhaltswert` | Tabelle 3 |
| `TABELLE4` / `TABELLE5` | `kennung` | (as printed) | `anhaltswert` | §6 |

- [ ] **Step 3: Registers / selections**

`filterschichten` (M187-13, **create**) → `register` columns `lage number required`, `material lookup_key BILD3` (rows = printed layers; the engineer confirms/adjusts thickness), `dicke_soll lookup_value {BILD3, material, dicke_cm}`, `dicke_ist_cm number required`, `gak_vol_pct number`, `gak_min lookup_value`, `gak_max lookup_value`, `caco3_pct number`, `gak_ok derived expr "if(gak_vol_pct >= gak_min AND gak_vol_pct <= gak_max, 1, 0)"`.
`teilfilterbecken` (M187-20, **create**) → `label text`, `flaeche_m2 number required`, `in_betrieb boolean`; `filtersegmente` (M187-14, **create**) → `label text`, `flaeche_m2 number`, `retentionsvolumen_m3 number`, `beschickungstag text`; `sorptionsstufen` (M187-09, **create**) → `stufe number`, `ebct_min number`, `h_fk_ss number`, `v_filter number`; `klein_rbf_elemente` (M187-21, **create**) → `label text`, `a_b_a_m2 number required`, `a_f_m2 number required`, `anteil derived expr "a_f_m2 * 100 / a_b_a_m2"`, `h_rr number`, `h_rbf number`; `indikatororganismen` (M187-16, **create**) → `organismus enum [e_coli, enterokokken, coliphagen]`, `einheit enum [kbe, mpn, pbe]`, `zulauf number`, `ablauf number`, `log_red derived expr "log10(zulauf / ablauf)"`.
`daten_vorhanden` (M187-20, **create** boolean) → `attestation` (label = "Liegen keine Daten vor …" sentence). `lookup_fill`: `h_FK_min` (create, M187-01, role `limit`) ← `S5_LIMITS` keys `[{ column: 'sonderanwendung', from_symbol: 'sonderanwendung' }, { column: 'variante', from_symbol: 'verfahrensvariante_aktiv' }]` where `verfahrensvariante_aktiv` is a created text field derived… (G-9: a derived key) → instead two `lookup_fill` fields `h_FK_min_p` (keys `sonderanwendung`, `verfahrensvariante_p`) and `h_FK_min_spur` (keys `sonderanwendung`, `verfahrensvariante_spurenstoffe`) each `visible_when` its branch; same for `q_Dr_RBF_limit`. Gates `h_FK >= h_FK_min_*` STAGED (`m187-G-1`) replacing REQ-02/03/04.
Carbonate: `h_FK_CaCO3`, `CaCO3_massenanteil_carbo` `visible_when "carbonatschicht_vorhanden == true"`.

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| top-level sections of M187-05…-10 | `sonderanwendung == '<p token>'` | §5.1 |
| M187-11…-15 | `sonderanwendung == '<spurenstoffe token>'` | §5.2 |
| M187-16…-18 | `sonderanwendung == '<mikroorganismen token>'` | §5.3 |
| M187-19/-20 | `sonderanwendung == '<organische_belastung token>'` | §5.4 |
| M187-21/-22 | `sonderanwendung == '<klein_rbf token>'` | §5.5 |
| variant-a / -b / -c fields on M187-05/06 | `verfahrensvariante_p == 'a'` etc. | §5.1.3.1 |
| variant fields on M187-11…-15 | `verfahrensvariante_spurenstoffe == 'a'` … ; segments (M187-14) only `'c'` | §5.2.3.1 |
| `UV_dosis` | `uv_eingesetzt == true` | §5.3.3.5 |
| `B_CSB` vs `A_F_pro_AEb` | `daten_vorhanden == true` / `== false` | §5.4.3 (REQ-05 both → `m187-G-2`) |
| `sickerwasser_in_rbf` | `CSB_konzentration > 3000` (printed) — gate STAGED `m187-G-3` | §5.4.2.2.2 |
| `filtervegetation` Gehölze/Schilf, `dauerhafter_teileinstau` | gates STAGED `m187-G-4/5` | §5.5.3.2.2 |

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `M187-13-D1` | -13 | `h_FK_lagen = sum_rows(filterschichten, if(material != '<draenagekies token>', dicke_ist_cm, 0)) / 100` | register | Bild 3 (1,00 m = 10+60+30) |
| `M187-14-D1` | -14 | `V_segment_soll = Q_T_d_aM * 86.4` (l/s→m³/d printed conversion) ; `segmente_count = count_rows(filtersegmente)` | as named | §5.2.3.1 c |
| `M187-20-D1` | -20 | `A_F_gesamt = sum_rows(teilfilterbecken, flaeche_m2)`; `A_F_aktiv = sum_rows(teilfilterbecken, if(in_betrieb, flaeche_m2, 0))`; `teilfilter_count = count_rows(teilfilterbecken)` | register | §5.4.3 (3 of 4) |
| `M187-20-D2` | -20 | `A_F_min_ohne_daten = lookup('S5_4_3_ORG', 'a_f_pro_aeb', 'wert') * A_E_b` | `A_E_b` | §5.4.3 "750 m²/ha" |
| `M187-20-D3` | -20 | `B_CSB_calc = CSB_fracht / A_F_aktiv` — `CSB_fracht` (create number) | as named | §5.4.3 |
| `M187-09-D1` | -09 | `h_FK_SS_calc = ebct * v_filter / 60` | as named | §5.1.3.1 c ("Das entspricht … 1,25 m") |
| `M187-22-D1` | -22 | `A_F_sum_klein = sum_rows(klein_rbf_elemente, a_f_m2)`; `A_b_a_sum_klein = sum_rows(…, a_b_a_m2)`; `elemente_unter_1m2 = count_rows(klein_rbf_elemente, a_f_m2 < 1)` (1 m² printed) | register | §5.5.4 |
| `M187-16-D1` | -16 | `log_red_min = min_rows(indikatororganismen, log_red)` | register | §5.3.4 |

STAGED: Gl. 1 duplicated on M187-09 (wrong worksheet) → deactivate copy (`m187-R-1`); REQ-06 forcing `A_F_anteil_Aba == 1.0` vs §5.5.4 override with Gl. 2 (`m187-G-6`).

- [ ] **Step 6: Emit + tests** (`m187`, `20260917101200` / `…10` / `…20`). Render test: `filterschichten` two rows, BILD3 fills.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `m187-verify`; §5 wins 1 ✓ (gates STAGED), 2 Phase 6, 3 Phase 6, 4 ✓, 5 ✓ (0,2 m claim residue).

---
### Task 13: DIN-276 — stage × KG matrix as one register, KG items with quantity + Tab. 2/3/4 unit + Kennwert, Sonderkosten/Vergabeeinheiten/Abweichungen/Flurstücke registers, missing roll-ups, KG/stage gating

**Inputs:** inventory `…/inventory/DIN-276.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-276\DIN-276.md` (English translation; Table 1 l.461ff, Table 2 l.1026, Table 3 l.1048, Table 4 l.1170); harness `tests/harness/din276-verify.integration.test.ts`, `seed-din276.ts`; prod: 29 worksheets, 544 fields, 53 equations, 32 requirements. Already on the mechanism: `applicable_cost_groups`, `planning_stage_active`, `special_cost_flags`, `input_documents_register` (Plan-1 configs, `20260911120000_selection_configs_DIN_276.sql`) — used as drivers below (`select_many` ⇒ visibility via `contains()` is a sign-off item per rule 8).

**Estimated size:** tables 4 (TABLE1 ≈ every printed KG row with `designation`, `notes`, `level` — ≈ 250 rows; TABLE2 8 rows; TABLE3 ≈ all KG 3xx rows; TABLE4 ≈ all KG 4xx rows) / registers 6 (`kostenstufen_matrix`, `kg_positionen`, `sonderkosten`, `vergabeeinheiten`, `abweichungen`, `flurstuecke`, `kennwert_quellen`) / select_one 3 created (`kg_selector` on -24, `cost_breakdown_depth` exists — keep) / lookup_fill 2 (`reference_unit` + designation on -24 by `kg_selector`) / field `visible_when` 6 / section `visible_when` KG worksheets -09…-16 and stage worksheets -18…-22 (drivers are `select_many` → sign-off `din276-M-1/2` with the `contains()` strings) / equations ≈ 18 new (the missing sums) + 4 staged (duplicate-worksheet retirements) / sign-off ≈ 12. Time saved (§5): ~90 stage EUR fields collapse into one matrix with derived totals/deviations; every KG item gets Menge × Kennwert; 22 duplicate fields (Phase 6); Sonderkosten rows drive REQ-10…14; gating removes 250 third-level fields from a Kostenrahmen.

**Files:** `regulation-tables-seed-din276.ts`, `field-configs/din276.ts` + prior, `equations/din276.ts`, tests, `register-din276-matrix.test.tsx`, STAGED, report; migrations `20260917101300` / `…10` / `…20`.

- [ ] **Step 1: Read.** Transcript Table 1 completely (l.461–1020 — every KG row: code, designation, notes), Table 2 (l.1026–1040), Table 3 (l.1048–1168), Table 4 (l.1170ff), §4.2.8 multi-building, §4.2.10–4.2.15 special costs/VAT, §4.3.2–4.3.7 stages, §4.4.2/4.4.3 comparison/deviations, §4.6.2 cost target, §5.3 execution-oriented. Capture prior (the ~250 `kg_NNN` symbols with their worksheet and the 48 roll-up equations' output symbols; the five stage worksheets' symbol pattern `KR_KG_100` …).

- [ ] **Step 2: Tables** (`standard_code 'DIN-276'`):

| table_code | key_columns | value_columns | policy (cue) | rows |
|---|---|---|---|---|
| `TABLE1` | `kg` (the printed code as token, e.g. `kg_311`) | `designation` (string), `notes` (string, nullable), `level` (number 1/2/3), `parent_kg` (string) | `anhaltswert` (notes column: "The goods, services … are examples … The list is not exhaustive") — the STRUCTURE (codes, designations) is `locked`; record both in `override_quote` | l.461ff (≈250 rows — the pin asserts the count the executor reaches; every row quoted) |
| `TABLE2` | `kg` (kg_100…kg_800) | `unit`, `designation`, `determination` (strings) | `anhaltswert` ("It is recommended that …") | l.1026–1040 |
| `TABLE3` | `kg` (3xx) | `unit`, `designation`, `determination` | `anhaltswert` | l.1048–1168 |
| `TABLE4` | `kg` (4xx) | same | `anhaltswert` | l.1170ff |

- [ ] **Step 3: Registers / selections**

`kostenstufen_matrix` (DIN-276-18, **create**; supersedes the five stage worksheets functionally — they stay until Phase 6) → `register`:
```json
{ "title": "Kostenermittlungsstufen × Kostengruppen", "subtitle": "§4.3.2–4.3.7 — je Stufe eine Zeile mit KG 100–800, Σ, Eigenleistung/Prognose/Risiko", "add_label": "+ Stufe",
  "columns": [
    { "key": "stufe", "label": "Stufe", "type": "enum", "options": ["kr", "ksch", "kber", "ka", "kf"], "required": true, "discriminator": true },
    { "key": "datum", "label": "Datum", "type": "date", "required": true },
    { "key": "kg100", "label": "KG 100", "type": "number", "unit": "EUR", "min": 0 },
    { "key": "kg200", "label": "KG 200", "type": "number", "unit": "EUR", "min": 0 },
    { "key": "kg300", "label": "KG 300", "type": "number", "unit": "EUR", "min": 0 },
    { "key": "kg400", "label": "KG 400", "type": "number", "unit": "EUR", "min": 0 },
    { "key": "kg500", "label": "KG 500", "type": "number", "unit": "EUR", "min": 0 },
    { "key": "kg600", "label": "KG 600", "type": "number", "unit": "EUR", "min": 0 },
    { "key": "kg700", "label": "KG 700", "type": "number", "unit": "EUR", "min": 0 },
    { "key": "kg800", "label": "KG 800", "type": "number", "unit": "EUR", "min": 0 },
    { "key": "gesamt", "label": "Σ KG 100–800", "type": "derived", "expr": "kg100 + kg200 + kg300 + kg400 + kg500 + kg600 + kg700 + kg800" },
    { "key": "bauwerk", "label": "Bauwerkskosten (300+400)", "type": "derived", "expr": "kg300 + kg400" },
    { "key": "eigenleistung", "label": "Eigenleistungen", "type": "number", "unit": "EUR" },
    { "key": "prognose", "label": "Prognosekosten", "type": "number", "unit": "EUR" },
    { "key": "risiko", "label": "Risikokosten", "type": "number", "unit": "EUR" }
  ] }
```
(the stage tokens' labels are the printed stage names §4.3.2–4.3.7, lifted; KG 300/400 sum = "building costs" per IDENT-02 — printed definition quoted.)
`kg_positionen` (DIN-276-09, **create**; one register for all 3rd-level items — the eight KG worksheets stay) → `kg lookup_key TABLE1 required` (group_by `parent_kg`), `designation lookup_value {TABLE1, kg, designation}`, `menge number`, `einheit derived expr "lookup('TABLE_UNITS', kg, 'unit')"` where `TABLE_UNITS` = the union of TABLE2/3/4 keyed by `kg` (seeded as one table `TABLE234` — each row quoted from its own table), `kennwert number EUR/unit`, `kosten_calc derived expr "menge * kennwert"`, `kosten_eur number EUR required`, `kosten_override boolean`; `override { flag_key: 'kosten_override', applies_to: ['kosten_eur'], policy: 'anhaltswert' }` (cue Table 2 "recommended").
`sonderkosten` (DIN-276-08, **create**) → `art enum [<the five §4.2.10–4.2.14 kinds — prod special_cost_flags option tokens>] required discriminator`, `kg lookup_key TABLE1`, `betrag number EUR required`, `annahmen text`, `separat_ausgewiesen boolean`.
`vergabeeinheiten` (DIN-276-21, **create**) → `label text required`, `gewerk text`, `kg lookup_key TABLE1`, `angebot number`, `auftrag number`, `rechnung number`, `status enum [angebot, auftrag, rechnung]`.
`abweichungen` (DIN-276-27, **create**) → `kg lookup_key TABLE1 required`, `betrag number`, `pct number`, `typ enum [<the §4.4.3 types the description lists, lifted>]`, `ursache text`, `massnahme text`.
`flurstuecke` (DIN-276-04, **create**) → `gemarkung text`, `flur text`, `flurstueck text required`, `flaeche_m2 number required`.
`kennwert_quellen` (DIN-276-07, **create**) → `kg lookup_key TABLE1`, `quelle text`, `stand date`, `region text`, `preisstand text`, `standard text`.
`kg_selector` (DIN-276-24, **create** enum = TABLE2 keys) → `select_one`; `reference_unit` (existing) → `lookup_fill` `{ TABLE2, role value, keys [{ column 'kg', from_symbol 'kg_selector' }], value 'unit' }` (fixes the "(Engineer: Label/Einheit pruefen)" placeholder — `din276-S-1`).
Free-text fields the description lists as fixed options (`*_lph`, `*_kostenstatus`, `KK_stage_*`, `GK_quelle_stage`, `AA_typ`) → `select_one` with `enum_values` lifted from the transcript sentence that lists them (only where the transcript prints the list; else `din276-J-1`), `data_type` change STAGED.

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| KG worksheets -09…-16 sections | driver `applicable_cost_groups` is `select_many` → NOT emitted; `din276-M-1` proposes `contains(applicable_cost_groups, 'KG 300')` per worksheet | §5.1 |
| stage worksheets -18…-22 sections | `planning_stage_active` `select_many` → `din276-M-2` | §4.3.2ff |
| 3rd-level `kg_NNN` fields | `cost_breakdown_depth == 'level_3'`; 2nd-level `IN {'level_2', 'level_3'}` | §4.2.2/§5.2 |
| `separate_calculations_per_building` (-02) | `multi_building == true` | §4.2.8 |
| `existing_substance_value` (-08) | `construction_activity IN {<umbau, sanierung tokens>}` | §4.2.9 (REQ-09 empty → STAGED `din276-G-1`) |
| `cost_target_upper_limit` / `cost_target_lower_limit` (-28) | `cost_target_type == 'upper_limit'` / `'target_figure'` | §4.6.2 |
| `GK_mwst_satz_pct` (-23) | `vat_treatment == '<brutto token>'` | §4.2.15 |

- [ ] **Step 5: Derived** (existing 48 roll-ups untouched; new):

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `DIN-276-18-D1…D5` | -18 | `KR_gesamt_calc = sum_rows(kostenstufen_matrix, if(stufe == 'kr', gesamt, 0))` … one per stage (`KSch_`, `KBer_`, `KA_`, `KF_`) | register | §4.3.x "Σ KG 100-800" (hand-typed today → `din276-D-1` for the five `*_gesamt`) |
| `DIN-276-26-D1` | -26 | `current_stage_total_calc = sum_rows(last_rows(kostenstufen_matrix, 1), gesamt)`; `previous_stage_total_calc = sum_rows(last_rows(kostenstufen_matrix, 2), gesamt) - current_stage_total_calc` | register | §4.4.2 (rows ordered by entry; a date-ordered pick is G-5 → `din276-F-1`) |
| `DIN-276-27-D1` | -27 | `deviation_calc = current_stage_total_calc - previous_stage_total_calc`; `deviation_pct_calc = deviation_calc * 100 / previous_stage_total_calc` | as named | §4.4.3 (IDENT-04 exists on typed inputs → `din276-R-1`) |
| `DIN-276-27-D2` | -27 | `abweichungen_sum = sum_rows(abweichungen, betrag)` | register | §4.4.3 |
| `DIN-276-09-D1` | -09 | `kg_positionen_sum = sum_rows(kg_positionen, kosten_eur)`; per 2nd-level `kg_3N0_from_rows = sum_rows(kg_positionen, if(<parent match via lookup('TABLE1', kg, 'parent_kg') == 'kg_310'>, kosten_eur, 0))` — `lookup()` returning a string compared in a condition: supported (`lookup(...) == paved` in Plan 2a tests) | register | Table 1 structure; feeding the existing `kg_NNN` symbols = `din276-R-2` |
| `DIN-276-23-D1` | -23 | `GK_kennwert_BGF_calc = GK_total / gross_floor_area_BGF`; `cost_parameter_per_AF_calc = kg_500_total / outdoor_area_AF` | as named | Table 2 units (three duplicate Kennwert fields → `din276-X-1`) |
| `DIN-276-08-D1` | -08 | `sonderkosten_<art>_sum = sum_rows(sonderkosten, if(art == '<token>', betrag, 0))` ×5 | register | §4.2.10–14; REQ-10…14 onto them STAGED `din276-G-2` |
| `DIN-276-21-D1` | -21 | `final_contract_value_calc = sum_rows(vergabeeinheiten, auftrag)`; `KA_angebote_count = count_rows(vergabeeinheiten, status == 'angebot')` | register | §4.3.5 |
| `DIN-276-04-D1` | -04 | `grundstuecksflaeche_GF_calc = sum_rows(flurstuecke, flaeche_m2)` | register | Table 2 GF |
| `DIN-276-24-D1` | -24 | `KKW_analyse_eur_m2_BGF_calc = GK_total / gross_floor_area_BGF`; `KKW_analyse_kg300_anteil_calc = kg_300_total * 100 / GK_total` | as named | §6 |

STAGED retirements: -17 `klassif_*`, -25 `BKO_*`, -06 `BU_*` duplicates → inheritance (`din276-X-2`, 22 fields); `GK_brutto_netto` text vs `vat_treatment` enum (`din276-X-3`).

- [ ] **Step 6: Emit + tests** (`din276`, `20260917101300` / `…10` / `…20`); TABLE1 pin asserts the counted row total and that every `parent_kg` exists. Render test: matrix two stage rows, `gesamt`/`bauwerk` derived.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `din276-verify`; §5 wins 1 ✓ (matrix; stage worksheets retire Phase 6), 2 ✓, 3 Phase 6, 4 ✓, 5 partially (drivers are `select_many` → M-1/M-2).

---

### Task 14: DWA-A-178 — Teilflächen rows (Gl. 2/3), `system_type` master switch, Vorstufentyp → η_VS (Tabelle 1, `kann`), `becken_typ`+`rrl_vorhanden` pick one b_F formula, V_RBF and per-path loads registered

**Inputs:** inventory `…/inventory/DWA-A-178.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-178\DWA-A_178.md`; harness `tests/harness/a178-verify.integration.test.ts`, `seed-a178.ts`; prod: 19 worksheets, 118 fields, 13 equations, 28 requirements. Reasoning maps `reasoning-maps/DWA-A-178/` (structure only).

**Estimated size:** tables 4 (`TABELLE1` 4 η rows + footnote row; `S6_1_4_5` h_FK by system; `S6_2_TEXT` (b_R_a Rechenwert, q_Dr_RBF, b_krit, v_spez, e_0 cap, n_RBF, t_RR, A_F Straße, h_RR, Porenvolumen 15 %, Pflanzdichte, Bahnstärke, U/Feinanteil/Überkorn/CaCO3) one row per printed sentence; `TABELLE2` indicators (informative, no field target — seeded for the register datalist)) / registers 4 (`teilflaechen_178`, `frachtpfade`, `iterationen`, `betriebsbefunde`) / select_one 2 created (`vorstufe_typ`, `spezifische_ziele_formuliert` boolean) / lookup_fill 5 (`eta_VS` `kann`; `h_FK_required` by `system_type`; `q_Dr_RBF_default`, `b_krit`, `v_spez_grobstoff_min`) / field `visible_when` 8 / section `visible_when` A178-12…-16 Nachweis when Straße simplification / equations 6 new + 3 staged (Gl. 5/6/7 switch; Gl. 2/3 switch; `eta_F` circularity) / sign-off ≈ 10. Time saved (§5): Σ over rows; one formula chosen by switches; Vorstufe → η_VS; V_RBF and per-path loads computed.

**Files:** `regulation-tables-seed-a178.ts`, `field-configs/a178.ts` + prior, `equations/a178.ts`, tests, `register-a178-teilflaechen.test.tsx`, STAGED, report; migrations `20260917101400` / `…10` / `…20`.

- [ ] **Step 1: Read.** Transcript Tabelle 1 + Anmerkung 1), §6.2.2.1 (b_R,a 530 Rechenwert sentence; b_krit; Schritt 4 Porenvolumen 15 %), Gl. (1)–(13) as printed (OCR "GI." — normalise in quotes with a note), §6.2.2.2 Straße, §6.2.1.1/6.2.1.2/6.2.1.3, §6.2.2.3 c), §6.1.4.3/.5/.6/.7/.9, Tabelle 2. Capture prior (`system_type`, `becken_typ`, `rrl_vorhanden`, `wasserschutzgebiet`, `belastungs_data_source`).

- [ ] **Step 2: Tables** (`standard_code 'DWA-A-178'`): `TABELLE1` keys `komponente` (vs/f/rr/rrl) values `eta_afs63` (number), `eta_alt` (number, nullable — the footnote 0,2 for VS), `bedingung` (string) — policy `kann` (footnote "Bei vorhandenen RKB (q_A ≤ 10 m/h) oder RÜB-DB kann für AFS63 η_VS = 0,2 angesetzt werden"; the other three are "Rechenwerte … zur Anwendung in Gl. (5) bis Gl. (7)" → `locked` rows; per-row `override_quote`). `S6_1_4_5` keys `system_type` (prod tokens) value `h_fk_min_m` — `locked`. `S6_2_TEXT` keys `parameter` (b_r_a/q_dr_rbf/b_krit/b_f_min/v_spez/e_0_max/n_rbf_min/t_rr_max_h/a_f_strasse_m2_ha/h_rr_min_strasse/porenvolumen_pct/pflanzdichte_min/pflanzdichte_max/bahn_min_mm/u_max/feinanteil_max/ueberkorn_max/caco3_min) values `wert`, `unit`, `modal` — policy per row (`anhaltswert` for "kann … angesetzt werden"/"Rechenwert", `locked` for "muss"/"≥"); `TABELLE2` keys `bauteil`,`befund` value `hinweis` — `anhaltswert`.

- [ ] **Step 3: Registers / selections**

`teilflaechen_178` (A178-04, **create**) → `register` columns `label text required`, `a_e_b_a_i number ha required min 0`, `b_r_a_i number kg/(ha·a)` (default = the Rechenwert via `lookup_value` on `S6_2_TEXT` key… (G-12) → `b_r_a_i lookup_value { S6_2_TEXT, key_column: 'param_const', value: 'wert' }` with a `param_const` `lookup_key` column preset to `b_r_a`? Not expressible — use `b_r_a_default derived expr "lookup('S6_2_TEXT', 'b_r_a', 'wert')"` and `b_r_a_i number` engineer-entered with `messwert` note (`belastungs_data_source`)), `e_0_i number visible_when "system_type == '<misch token>'"`, `b_row derived expr "if(system_type == '<misch>', a_e_b_a_i * b_r_a_i * e_0_i / 100, a_e_b_a_i * b_r_a_i)"` (e_0 in % — lift the unit).
`frachtpfade` (A178-13/14, **create**) → `pfad enum [dr_rbf, fue, dr_rrl] required discriminator`, `vq_m3 number required`, `eta lookup_value`? (TABELLE1 keyed by komponente ≠ pfad tokens → `eta derived expr "if(pfad == 'dr_rbf', lookup('TABELLE1', 'f', 'eta_afs63'), if(pfad == 'fue', lookup('TABELLE1', 'rr', 'eta_afs63'), lookup('TABELLE1', 'rrl', 'eta_afs63')))"`), `eta_override number` (audited, `kann`/`anhaltswert`), `eta_used derived expr "if(eta_override > 0, eta_override, eta)"`, `b_ab derived expr "vq_m3 * C_RBF_zu * (1 - eta_used) / 1000"` (Gl. 11 component form — lift), `visible_when` for `dr_rrl` rows handled by the worksheet's `rrl_vorhanden`.
`iterationen` (A178-18, **create**) → `schritt number required`, `a_f number`, `v_rbf number`, `b_f number`, `konvergiert boolean`.
`betriebsbefunde` (A178-18, **create**) → `bauteil lookup_key TABELLE2`, `befund lookup_value`, `hinweis lookup_value`, `datum date`.
`vorstufe_typ` (A178-13, **create** enum: rkb_le10 / rueb_db / sonstige / stauraum_unten — labels lifted from the footnote and §6.2.1) → `select_one`; `eta_VS` (existing) → `lookup_fill` `{ TABELLE1_VS, role value, keys [{ column 'vorstufe', from_symbol 'vorstufe_typ' }], value 'eta_afs63' }` where `TABELLE1_VS` is the footnote split into two rows (rkb_le10/rueb_db → 0,2-row; sonstige → 0-row) each quoting the footnote — policy `kann`. `spezifische_ziele_formuliert` (A178-02, **create** boolean) → `attestation`. `h_FK_required` (existing) → `lookup_fill` `{ S6_1_4_5, role limit, keys system_type, value h_fk_min_m }`; `b_krit` (existing, typed) → `lookup_fill` on `S6_2_TEXT_BKRIT` (single row) keyed… G-12 → seed `S6_2_BKRIT` with key `system_type` (same value each row, each quoting the sentence) — record `a178-J-1` (a constant needs no key; the executor may instead leave `b_krit` scalar with `verification_quote` and REQ-19's literal 7 → `a178-G-1`).

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| `e_0`, `t_RR_E_n1`, `n_RBF` | `system_type == '<misch>'` | §6.2.1.1, §6.2.2.3 c |
| `v_spez_grobstoff` | `system_type IN {<trenn>, <strasse>}` | §6.2.1.2 |
| `leichtfluessigkeitsfang` fields | `system_type == '<strasse>' AND wasserschutzgebiet != '<zone_none>'` | §6.2.1.3 |
| top-level sections A178-12…-16 (Nachweis) | `spezifische_ziele_formuliert == true OR system_type != '<strasse>'` | §6.2.2.2/§6.2.2.3 "kann auf das Nachweisverfahren verzichtet werden" |
| `VQ_FU`, `eta_RR`, `B_FU` | `becken_typ == '<durchlauf>'` | Gl. 6/7 |
| `V_RRL`, `VQ_Dr_RRL`, `eta_RRL`, `B_RRL` | `rrl_vorhanden == true` | §6.1 RRL |
| `fremdwasser_*` (A178-05) | `fremdwasser_relevant == true` | §5.2.2 (REQ-05 STAGED `a178-G-2`) |

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `A178-04-D1` | -04 | `A_E_b_a_calc = sum_rows(teilflaechen_178, a_e_b_a_i)` | register | Gl. 2/3 |
| `A178-09-D1` | -09 | `B_RBF_zu_calc = sum_rows(teilflaechen_178, b_row)` | register | Gl. 2/3 — `a178-R-1` for the existing Gl. 2/3 pair |
| `A178-13-D1` | -13 | `b_F_calc = sum_rows(frachtpfade, vq_m3 * eta_used) * C_RBF_zu / (A_F * 1000)` — the executor lifts Gl. 5/6/7 and writes the one row-sum that reproduces each | register + as named | Gl. 5/6/7 — `a178-R-2` (three same-output rows) |
| `A178-13-D2` | -13 | `C_RBF_zu_calc = C_RBFA_zu * (1 - eta_VS)` | as named | "Wird die Wirksamkeit der Vorstufe … mit Null angenommen …" (lift) |
| `A178-11-D1` | -11 | `V_RBF_calc = V_RR + lookup('S6_2_TEXT', 'porenvolumen_pct', 'wert') / 100 * V_FK` | as named | Schritt 4 "pauschal mit 15 %" |
| `A178-14-D1` | -14 | `B_RBFA_ab_calc = sum_rows(frachtpfade, b_ab) + B_VS` | register | Gl. 11 |
| `A178-18-D1` | -18 | `iteration_count_calc = count_rows(iterationen)`; `A_F_last = sum_rows(last_rows(iterationen, 1), a_f)` | register | §6.2.2.4 |
| `A178-10-D1` | -10 | `A_F_strasse = lookup('S6_2_TEXT', 'a_f_strasse_m2_ha', 'wert') * A_E_b_a_calc` | as named | §6.2.2.2 |

STAGED: `eta_F` both input (Gl. 5–7) and output (Gl. 13) → `a178-R-3` (Tabelle-1 value for design, Gl. 13 for evaluation — two symbols); summary copies on A178-08 → inheritance (`a178-X-1`); three verdict fields (`a178-X-2`).

- [ ] **Step 6: Emit + tests** (`a178`, `20260917101400` / `…10` / `…20`). Render test: `teilflaechen_178` two rows, `e_0_i` hidden for Trenn.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `a178-verify`; §5 wins 1 ✓, 2 ✓, 3 ✓, 4 ✓ (switch STAGED), 5 ✓.

---

### Task 15: DIN-EN-16941-2 — Grauwasserquellen rows (Tab. A.2 ranges as hints, not limits), Bedarfsstellen rows (Tab. A.3), `berechnungsverfahren` switch with Tab. A.1, `vorgesehene_nutzung` → Richtwerte G (Tab. D.1/D.2) → per-sample status (Tab. D.3/D.4), multi-select sources/stages

**Inputs:** inventory `…/inventory/DIN-EN-16941-2.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-EN-16941-2\DIN-EN-16941-2.md`; harness `tests/harness/din16941-2-verify.integration.test.ts`, `seed-din16941-2.ts`; prod: 5 worksheets, 76 fields, 2 equations, 19 requirements. Spec §7 audit hits: `behandlungsstufen` and `grauwasser_herkunft` are single today and must become `select_many` (prod `enum_values` non-null → D-1 keep values; `widget = 'select_many'` + `ui_config` written; the `data_type` stays enum — the carrier change enum→json is STAGED `din16941_2-S-1`; until ratified the widget switch alone is not renderable → the executor emits the config but flags "encoded, not behaving" in the report).

**Estimated size:** tables 6 (TABA1 1 row × 4 values → 4 rows keyed `posten`; TABA2 5 rows; TABA3 3 rows; TABD1 4 params × 4 uses; TABD2 4 × 4; TABD3 3 status rows + TABD4 2; Anhang B system types 5 rows) / registers 4 (`grauwasserquellen_16941`, `bedarfsstellen`, `probenahmen`, `speichereinrichtungen`) / select_one 2 created (`sprueh_anwendung` boolean attestation; `speicher_lage`) / lookup_fill 8 (Richtwerte G per parameter by `vorgesehene_nutzung`) / field `visible_when` 9 / section 0 / equations 6 new + 1 staged (`bemessungswert_massgebend` = min — text-only) / sign-off ≈ 9 (incl. the data-quality finding that validation_rules hard-limit informative ranges — `din16941_2-G-1`, propose demotion to hints). Time saved (§5): 16 always-visible scalars → rows; Gl. 2 rows; `min(Y_G, D_G)` registered + 50 % cap; Tab. A.1 simplified path; use-specific Richtwerte replacing wrong fixed limits; CR-08/13 conditions.

**Files:** `regulation-tables-seed-din16941_2.ts`, `field-configs/din16941_2.ts` + prior, `equations/din16941_2.ts`, tests, `register-din16941-quellen.test.tsx`, STAGED, report; migrations `20260917101500` / `…10` / `…20`.

- [ ] **Step 1: Read.** Transcript L140 (scope exclusion), L219, L238, L286, L296, L306–308, L327, L338, L350–352, L360–364, L377, L395, L401–419, L511, L521–547, L565–597 (Gl. 1/2 legend), L633, L681, L697, L724, L737–749 (Tab. A.1), L759–769 (A.2), L773–781 (A.3), L788–806 (Anhang B), L848–862 (D.1), L866–877 (D.2), L881–906 (D.3/D.4).

- [ ] **Step 2: Tables** (`standard_code 'DIN-EN-16941-2'`):

| table_code | key_columns | value_columns | policy (cue) | rows |
|---|---|---|---|---|
| `TABA1` | `posten` (ertrag/bedarf_wc/bedarf_waesche/bedarf_andere) | `l_pd` (number), `fussnote` (string) | `anhaltswert` ("Beispiele für typische durchschnittliche …") | L737–749 |
| `TABA2` | `quelle` (dusche/badewanne/waschmaschine/kuechenspuele/geschirrspueler) | `min`, `max`, `unit`, `basis` (string: je Nutzung / je Zyklus / l/min) | `anhaltswert` ("Typische Größenordnungen") — SR-2 hints, never limits | L759–769 |
| `TABA3` | `bedarf` (wc/urinal/waschmaschine) | `min`, `max`, `unit` | `anhaltswert` | L773–781 |
| `TABD1_<PARAM>` ×4 (e_coli/enterokokken/legionella/coliforme) | `nutzung` (sprueh/wc/garten/reinigung_waschmaschine — mapped to prod `vorgesehene_nutzung` tokens, D-1; Sprüh is a created attestation because prod has no Sprüh use) | `g_value` (number, nullable = "Nicht nachweisbar"/"N/A"), `g_text` (string) | `locked` ("Die Beispiele in Anhang D sind Mindestanforderungen") | L848–862 |
| `TABD2_<PARAM>` ×4 (truebung/ph/rest_chlor/rest_brom) | `nutzung` | `g_min`, `g_max`, `g_text` | `locked` | L866–877 |
| `TABD3` | `band` (lt_g/g_to_10g/gt_10g) | `status` (gruen/gelb/rot), `aktion` (string) | `locked` (footnote b coliform exception → `override_quote`) | L881–893 |
| `TABD4` | `band` (lt_g/gt_g) | `status`, `aktion` | `locked` | L897–906 |
| `ANHANGB` | `anlagentyp` (a…e) | `beschreibung`, `zulaessige_nutzung` (string) | `anhaltswert` (informativ) | L788–806 |

- [ ] **Step 3: Registers / selections**

`grauwasserquellen_16941` (DIN-EN-16941-2-03, **create**) → `register` columns `quelle lookup_key TABA2 required discriminator`, `hint_min lookup_value {TABA2, quelle, min}`, `hint_max lookup_value`, `q_or_v number required` (the Q_x or V_x of Gl. 1 — label switches by `basis`), `t_x number visible_when "quelle IN {dusche, kuechenspuele}"` (duration for flow-based sources — legend lifted), `u_x number required` (Nutzungen/Tag), `ertrag_row derived expr "if(quelle IN {dusche, kuechenspuele}, q_or_v * t_x * u_x, q_or_v * u_x)"` (Gl. 1 term form per source — lift the legend), `in_hint derived expr "if(q_or_v >= hint_min AND q_or_v <= hint_max, 1, 0)"` (informative — no gate).
`bedarfsstellen` (-03, **create**) → `bedarf lookup_key TABA3 required`, `anzahl number` (WC types: "kann der Bedarf für jedes einzelne WC berechnet werden" L597), `v_x number required`, `u_x number required`, `bedarf_row derived expr "v_x * u_x * anzahl"`; `V_misc` stays scalar.
`probenahmen` (-04, **create**) → `date date required`, eight parameter columns `number`, per-parameter `g_*` derived from the `lookup_fill` symbols below, `status_*` derived: `if(e_coli < e_coli_G, 1, if(e_coli <= 10 * e_coli_G, 2, 3))` (10 × G printed in D.3), `status_max derived` (worst).
`speichereinrichtungen` (-02, **create**) → `label text`, `lage enum [oberirdisch, unterirdisch] discriminator`, `nennkapazitaet_l number required`, `abstand_wurzeln_m number visible_when "lage == 'unterirdisch'"`, `werkstoff text`.
`sprueh_anwendung` (-01, **create** boolean) → `attestation`; `speicher_lage` (-02, **create** enum) → `select_one`; `nachspeisung_medium_16941` (-02, **create** enum trinkwasser/andere) → `select_one`; `personenzugang` (-02, **create** boolean) → `attestation`.
Richtwerte: `e_coli_G`, `enterokokken_G`, `legionella_G`, `coliforme_G`, `truebung_G_max`, `ph_G_min`, `ph_G_max`, `rest_chlor_G_max`, `rest_brom_G_max` (**create** numbers on -04) → `lookup_fill` role `limit` keyed `[{ column 'nutzung', from_symbol 'vorgesehene_nutzung' }]` (Sprüh column: a second set keyed on `sprueh_anwendung` — G-15 boolean key tokens `true`/`false`); the existing hard VRs (`truebung_ntu < 10` etc.) → `din16941_2-G-1` (demote); `bewertung_status` (manual enum) derivation → `din16941_2-D-1`.
`grauwasser_herkunft`, `behandlungsstufen` (-01) → `widget 'select_many'`, `enum_values 'keep_prod'`, `ui_config { title, note: 'eine oder mehrere' (lifted L531–535 / stages a)–f)) }` + `din16941_2-S-1` (data_type).

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| Gl. 1/2 input fields, both registers (-03) | `berechnungsverfahren == '<differenziert token>'` | L543 (vereinfacht only Wohngebäude) |
| Tab. A.1 per-person fields (created `ertrag_vereinfacht`, `bedarf_vereinfacht_*` as `lookup_fill` role `value` on `TABA1` keyed… G-12 constant key → equation below instead) | `berechnungsverfahren == '<vereinfacht>'` | L547 |
| `rueckflusssicherung_typ`, Geruchsverschluss fields | `nachspeisung_medium_16941 == 'trinkwasser'` | L350–352 (CR-08 STAGED `din16941_2-G-2`) |
| `abstand_wurzeln_m`, Standsicherheit-Höchstlasten | `speicher_lage == 'unterirdisch'` | L306–308, L633 (CR-13 STAGED `din16941_2-G-3`) |
| `zugang_oeffnung_mm` ≥ 400 rule | `personenzugang == true` (gate STAGED `din16941_2-G-4`) | L327 |
| `legionella_kbe`, `legionella_G` | `sprueh_anwendung == true` | Tab. D.1 |
| `warnsystem_ventilzulauf` | `ventilgesteuerte_zulaeufe == true` (create boolean) | L360 |
| `pumpe_*` block | `pumpe_erforderlich == true` | L401 |

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `DIN-EN-16941-2-03-D1` | -03 | `Y_G_rows = sum_rows(grauwasserquellen_16941, ertrag_row) * n`? — Gl. 1 multiplies per-person terms by `n`: `Y_G_rows = n * sum_rows(grauwasserquellen_16941, ertrag_row)` | register, `n` | Gl. 1 (L565…) — `din16941_2-R-1` for the existing Gl. 1 |
| `…-03-D2` | -03 | `D_G_rows = n * sum_rows(bedarfsstellen, bedarf_row) + V_misc` | register, `n`, `V_misc` | Gl. 2 — `din16941_2-R-2` |
| `…-03-D3` | -03 | `Y_G_vereinfacht = n * lookup('TABA1', 'ertrag', 'l_pd')`; `D_G_vereinfacht = n * (lookup('TABA1', 'bedarf_wc', 'l_pd') + if(<waschen use>, lookup('TABA1', 'bedarf_waesche', 'l_pd'), 0) + if(<andere use>, lookup('TABA1', 'bedarf_andere', 'l_pd'), 0))` — the use flags come from `vorgesehene_nutzung` tokens (single select) or `din16941_2-J-1` | `n`, `vorgesehene_nutzung` | Tab. A.1 |
| `…-03-D4` | -03 | `bemessungswert_massgebend_calc = min(Y_G, D_G)` | as named | VR text only → `imported_unverified`, quote the sentence |
| `…-02-D1` | -02 | `nennkapazitaet_max = 0.5 * D_G` (50 % printed L511 "bis zu 50 % des Tagesbedarfs") | `D_G` | L511; gate STAGED `din16941_2-G-5` ("normalerweise … ausreichend" → warn) |
| `…-02-D2` | -02 | `nennkapazitaet_sum = sum_rows(speichereinrichtungen, nennkapazitaet_l)` | register | L296 |
| `…-04-D1` | -04 | `probenahmen_rot = count_rows(probenahmen, status_max == 3)`; `probenahmen_gelb = count_rows(probenahmen, status_max == 2)` | register | Tab. D.3 |
| `…-02-D3` | -02 | `freier_auslauf_A_min = max(2 * D_zulauf, 20)` (2×D, min 20 mm printed L377) — `D_zulauf` create number | as named | §5.5.2 |

- [ ] **Step 6: Emit + tests** (`din16941_2`, `20260917101500` / `…10` / `…20`). Render test: `grauwasserquellen_16941` two rows (dusche with t_x; waschmaschine without), hints filled.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `din16941-2-verify`; §5 wins 1 ✓ (multi-select carrier STAGED), 2 ✓, 3 ✓, 4 ✓, 5 ✓ (gates STAGED).

---

### Task 16: DWA-M-1200-2 — class-driven validation (Tab. 3 targets, N=16 rule, percentile choice), 16 paired sample rows per organism with LRV/MW/SD/P10 and the 15/16 · 8/16 verdict, Verfahrenskette stages with Tab. 6 monitoring and Tab. B.2 credits, `desinfektionsverfahren` dose switch

**Inputs:** inventory `…/inventory/DWA-M-1200-2.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-1200-2\DWA-M_1200-2_GD.md`; harness `tests/harness/m1200-2-verify.integration.test.ts`, `seed-m1200-2.ts`; prod: 19 worksheets (4 empty), 84 fields, 4 equations, 15 requirements. Cross-standard: `wassergueteklasse` re-typed from 1200-1 (`m1200_2-X-1`), `pfas_summe_20` µg/l vs ng/l (`m1200_2-U-1`, unit finding).

**Estimated size:** tables 6 (`TAB3_LOG10_<ORG>` reuse pattern of Task 5 but seeded HERE from THIS transcript's Tab. 3 (verbatim identical text — seeded under 1200-2's own code, quotes from l.<Tab. 3>); `S3_3_3` 2 rows (A: 15/16 & 1,0; B-1/C-1: 8/16 & 2,0); `ANHANGC1` percentile choice 2 rows; `TAB6` 8 stage rows; `TABB2` 12 stage rows × 3 organisms (erreichbar) + erwartbar; `TAB4` validation principles per stage (text); `TABE1` example — `anhaltswert`) / registers 5 (`validierungsproben` (paired), `verfahrenskette`, `betriebsparameter`, `routineproben_1200_2`, `kostenpositionen`) / select_one 1 created (`organismus` inside the register) / lookup_fill 6 / field `visible_when` 10 / section `visible_when` M12002-04/-05 by class (B-2/C-2/D → hidden) / equations 8 new + 2 staged (Gl. C.2-2 median → G-3; MW/SD typed) / sign-off ≈ 9. Time saved (§5): class pre-fills targets, N rule, percentile, N/A; 12 typed statistics → computed; stages spawn fields/credits; dose switch; 1200-1 inheritance (Phase 6).

**Files:** `regulation-tables-seed-m1200_2.ts`, `field-configs/m1200_2.ts` + prior, `equations/m1200_2.ts`, tests, `register-m1200-2-validierung.test.tsx`, STAGED, report; migrations `20260917101600` / `…10` / `…20`.

- [ ] **Step 1: Read.** Transcript Tab. 3 (this file's line — find "Arbeitshilfe A"), l.677–690 (§3.3.3), Anhang C.1/C.2 (Gl. C.2-1..3 as printed, incl. the 1,282 factor and the "< 1 KBE bzw. PFU" sentence), l.758ff (Tab. 4), l.1297 (Tab. 6), l.1748ff (Tab. B.2 incl. Chlor Ct condition), l.2164ff (Tab. E.1), REQ-10 "nur als Sekundärdesinfektion", Tab. 3 note f).

- [ ] **Step 2: Tables** (`standard_code 'DWA-M-1200-2'`): as listed above; `S3_3_3` keys `klasse_group` (a / b1_c1) values `n_total` (16), `n_pass_min` (15/8), `max_shortfall_log10` (1,0/2,0) — all lifted; `ANHANGC1` keys `klasse_group` value `percentile` (10/50); `TAB6` keys `stufe` (mbr/mf_uf/medienfiltration/ozon_bak/ro/uv/uv_aop/chlorung) values `parameter_online` (string), `parameter_periodisch` (string), `frequenz_periodisch` (string); `TABB2_<ORG>` ×3 (viren/protozoen/bakterien) keys `stufe` values `erreichbar` (number), `erwartbar_min`, `erwartbar_max` (nullable), `bedingung` (string); policies: `S3_3_3`/`ANHANGC1` `locked`, `TAB6` `anhaltswert` ("Beispiel für Betriebsparameter"), `TABB2` `anhaltswert` ("Indikative log10-Reduktionen"), `TAB3_*` `locked`.

- [ ] **Step 3: Registers / selections**

`validierungsproben` (M12002-05, **create**) → `register`:
```json
{ "title": "Validierungsproben (gepaart)", "subtitle": "§3.3.3 / Anhang C — je Organismus 16 korrespondierende Zulauf-/Ablaufproben", "add_label": "+ Probe",
  "columns": [
    { "key": "organismus", "label": "Indikatororganismus", "type": "enum", "options": ["e_coli", "somatische_coliphagen", "f_spez_coliphagen", "clostridium", "sulfatreduzierer"], "required": true, "discriminator": true },
    { "key": "date", "label": "Datum", "type": "date", "required": true },
    { "key": "x_i", "label": "Zulauf x_i", "type": "number", "required": true, "min": 0 },
    { "key": "y_i", "label": "Ablauf y_i", "type": "number", "required": true, "min": 0 },
    { "key": "below_detection", "label": "Ablauf < 1 KBE/PFU je 100 ml", "type": "boolean" },
    { "key": "lrv_i", "label": "LRV_i", "type": "derived", "expr": "log10(x_i / y_i)" },
    { "key": "ziel", "label": "Leistungsziel", "type": "derived", "expr": "if(organismus == 'e_coli', lookup('TAB3_LOG10_ECOLI', wassergueteklasse, 'target_log10'), if(organismus IN {somatische_coliphagen, f_spez_coliphagen}, lookup('TAB3_LOG10_COLIPHAGEN', wassergueteklasse, 'target_log10'), if(organismus == 'clostridium', lookup('TAB3_LOG10_CLOSTRIDIUM', wassergueteklasse, 'target_log10'), lookup('TAB3_LOG10_SULFAT', wassergueteklasse, 'target_log10'))))" },
    { "key": "erreicht", "label": "Ziel erreicht", "type": "derived", "expr": "if(below_detection OR lrv_i >= ziel, 1, 0)" },
    { "key": "shortfall", "label": "Unterschreitung", "type": "derived", "expr": "if(lrv_i >= ziel, 0, ziel - lrv_i)" }
  ] }
```
`verfahrenskette` (M12002-12, **create**) → `reihenfolge number required`, `stufe lookup_key TAB6 required discriminator`, `online_param lookup_value`, `periodisch lookup_value`, `credit_viren lookup_value {TABB2_VIREN, stufe, erreichbar}`, `credit_protozoen …`, `credit_bakterien …`, `auslegung text`, `betriebsfenster_min number`, `betriebsfenster_max number`.
`betriebsparameter` (M12002-13, **create**) → `stufe lookup_key TAB6`, `parameter text`, `messhaeufigkeit enum [online, taeglich, woechentlich]`, `alarmgrenze number`, `alarm_verzoegerung_min number`.
`routineproben_1200_2` (M12002-06, **create**) → `date date`, `parameter enum`, `wert number`, `limit derived` (from the `lookup_fill` limits keyed by `wassergueteklasse`), `ok derived`.
`kostenpositionen` (M12002-15, **create**) → `stufe lookup_key TAB6`, `kostenkennwert number`, `baupreisindex_jahr number`.
`lookup_fill` role `limit` on created `e_coli_limit_1200_2`, `enterokokken_limit`, `bsb5_limit`, `afs_limit`, `truebung_limit` keyed `wassergueteklasse` (tables `TAB3_<PARAM>` seeded from this transcript); `leistungsziel_log10` (existing) → its per-organism form lives in the register; scalar stays (`m1200_2-D-1`).
Dose switch (M12002-11): `uv_dosis`, `uv_dosis_referenz` `visible_when "desinfektionsverfahren == '<uv>'"`; `ozon_dosis_spez`, `reaktor_hydraulik_charakterisiert` `'<ozon>'`; `ct_wert`, `restchlor_freies` `'<chlor>'`; `clo2_restkonz` `'<clo2>'`; `perameisensaeure_konz` `'<pfa>'`. Membrane vs sand (M12002-09): `flux_membran`, `mbr_porendurchmesser` `visible_when "filtrationsverfahren IN {<mf, uf, mbr>}"`; `filtergeschw_*` for sand; `messhauefigkeit_integritaet`, `transmembrandruck` (M12002-13) same membrane set.

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| top-level sections of M12002-04, -05 | `wassergueteklasse IN {'A', 'B-1', 'C-1'}` | Tab. 3 "B-2: –", "C-2: –" |
| Anhang-C fields (`confidence_alpha`, `k_faktor_normal`) | `validierungsmonitoring_typ == '<umfaenglich>'` | §3.3.3 / Anhang C |
| `perzentil_10_log10` / `perzentil_50_log10` | `wassergueteklasse == 'A'` / `IN {'B-1','C-1'}` | Anhang C.1 |
| `legionella`, `intest_nematoden` | `aerosol_risk == true` / `weide_oder_futter == true` | Tab. 3 |
| `sekundaerdesinfektion_verfahren` | `sekundaerdesinfektion_erforderlich == true` | REQ-12 |

STAGED: REQ-05/06 onto the equations (`m1200_2-G-1/2`); REQ-09 Filtration for A–C-2 (`m1200_2-G-3`); Chlor "nur als Sekundärdesinfektion" (`m1200_2-G-4`).

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `M12002-05-D1` | -05 | `n_proben = count_rows(validierungsproben)` (per organism: `n_proben_ecoli = count_rows(validierungsproben, organismus == 'e_coli')` ×5) | register | §3.3.3 "je 16" |
| `M12002-05-D2` | -05 | `n_erreicht_ecoli = count_rows(validierungsproben, organismus == 'e_coli' AND erreicht == 1)` ×5 | register | §3.3.3 |
| `M12002-05-D3` | -05 | `max_shortfall_ecoli = max_rows(validierungsproben, if(organismus == 'e_coli', shortfall, 0))` ×5 | register | §3.3.3 |
| `M12002-05-D4` | -05 | `n_pass_min_calc = lookup('S3_3_3', if(wassergueteklasse == 'A', 'a', 'b1_c1'), 'n_pass_min')`; `max_shortfall_allowed = lookup('S3_3_3', …, 'max_shortfall_log10')` | `wassergueteklasse` | §3.3.3 |
| `M12002-05-D5` | -05 | `mw_log10_ecoli = mean_rows(validierungsproben, if(organismus == 'e_coli', lrv_i, 0))` — WRONG (zeros dilute the mean) → G-16: row functions have no per-condition filter except `count_rows`; the mean over a subset needs `sum_rows(reg, if(cond, v, 0)) / count_rows(reg, cond)` → `mw_log10_ecoli = sum_rows(validierungsproben, if(organismus == 'e_coli', lrv_i, 0)) / count_rows(validierungsproben, organismus == 'e_coli')`; SD over a subset is NOT expressible with `stdev_rows` (no filter) → `sd_log10_*` = `m1200_2-F-1` (interface gap F-16); alternative: one register per organism (5 registers, `stdev_rows` works) — the executor chooses per-organism registers `validierungsproben_<org>` ×5 if F-16 is not resolved before this task, and the config above becomes the template | register | Gl. C.2-1 |
| `M12002-05-D6` | -05 | `perzentil_10_ecoli = mw_log10_ecoli - 1.282 * sd_log10_ecoli` (1,282 printed Gl. C.2-1) | as named | Gl. C.2-1 |
| `M12002-05-D7` | -05 | `perzentil_50_*` = median → G-3, `m1200_2-F-2` | — | Gl. C.2-2 |
| `M12002-12-D1` | -12 | `credit_sum_bakterien = sum_rows(verfahrenskette, credit_bakterien)` (×3) | register | Tab. B.2 (indicative; compare vs `leistungsziel_log10` — warn only) |
| `M12002-13-D1` | -13 | `perzentil_konformitaet_calc = count_rows(routineproben_1200_2, ok == 1) * 100 / count_rows(routineproben_1200_2)` | register | REQ-03 ≥ 90 |
| `M12002-15-D1` | -15 | `kosten_summe = sum_rows(kostenpositionen, kostenkennwert)` | register | §8.2 |

- [ ] **Step 6: Emit + tests** (`m1200_2`, `20260917101600` / `…10` / `…20`). Render test: paired rows, `lrv_i`, `ziel` by class.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `m1200-2-verify`; §5 wins 1 ✓, 2 ✓ (SD/median gaps F-1/F-2), 3 ✓, 4 ✓, 5 Phase 6.

---
### Task 17: DIN-1989-2 — `filtertyp` gates A/B/C fields and Gl. 7 vs 8/9; DN as `select_one` with EN 12056-3 Tab. C.1 as `reference`; Tab. 2 test-step rows → η-curve; Tab. 3 Prüfstoff rows; required `V_Rueck` minima derived

**Inputs:** inventory `…/inventory/DIN-1989-2.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-1989-2\DIN-1989-2.md`; harness `tests/harness/din1989-2-verify.integration.test.ts`, `seed-din1989-2.ts`; prod: 4 worksheets, 42 fields, 9 equations, 17 requirements.

**Estimated size:** tables 5 (TAB1 ≈ 2 × 3 cells → 6 rows keyed (`filterart`, `sedimentationsvolumen`); TAB2 7 rows; TAB3 3 rows; TAB4 2 rows; TAB5 2 rows) / registers 4 (`prueflaeufe`, `pruefstoffe`, `behaeltnisse`, `kennzeichnung` checklist as `select_many`) / select_one 2 created (`sedimentationsvolumen`, `dn_nennweite`) / reference 1 (`q_max_en12056` — content boundary: EN 12056-3 Tab. C.1 is external → `reference` field, the number stays engineer-entered with the sentence L290 as `verification_quote`) / lookup_fill 1 (`filtertyp` ← TAB1 by (`funktionsprinzip`, `sedimentationsvolumen`), G-6 string) / field `visible_when` 10 / section 0 / equations 6 new + 2 staged (`V_Rueck_A/_B` input-vs-required split; Gl. 7 vs 8/9 switch) / sign-off ≈ 8. Time saved (§5): B/C filters no longer fail A-checks; one `Q_max`; η-curve rows; derived minima and `filtertrennwirkung_nachgewiesen`; Prüfstoff rows into Gl. 7–9.

**Files:** `regulation-tables-seed-din1989_2.ts`, `field-configs/din1989_2.ts` + prior, `equations/din1989_2.ts`, tests, `register-din1989-2-prueflaeufe.test.tsx`, STAGED, report; migrations `20260917101700` / `…10` / `…20`.

- [ ] **Step 1: Read.** Transcript L227–228 (DN ≤ 200), L250–257 (materials, Fallrohr), L267–277 (Tab. 1; header image → the column titles come from §5.3.2–5.3.4 sentences, cite them), L284 (Gl. 1), L290 (Q definition), L309–330 (Typ B), L386 (η ≥ 0,7), L390–396, L463–467 (test order), L483–504 (Tab. 2), L532–534, L548, L563–591 (Tab. 3), L606–607 (Tab. 4), L627–631, L692–700 (Kennzeichnung a–i), L715, L735–736 (Tab. 5).

- [ ] **Step 2: Tables** (`standard_code 'DIN-1989-2'`): `TAB1` keys `filterart` (rueckhalt/ableitung), `sedimentationsvolumen` (gross/klein/keines) value `typ` (string: prod `filtertyp` tokens) — `locked` ("sind Filter den in Tabelle 1 aufgeführten Typen zuzuordnen"; the "–" cell not seeded); `TAB2` keys `stufe` (p100/p50/p20/p10/p5/p2_5/p1) values `q_pct` (number), `pruefzeit_min` (number) — `locked`; `TAB3` keys `pruefstoff` (ldpe_folie/pp_kugeln/quarzsand) values `stueck` (nullable), `masse_g`, `konzentration_g_l`, `fussnote` — `locked`; `TAB4` keys `kornklasse` values `anteil_pct` — `locked`; `TAB5` keys `merkmal` values `pruefung`, `haeufigkeit` — `locked`.

- [ ] **Step 3: Registers / selections**

`prueflaeufe` (DIN-1989-2-03, **create**) → `register` columns `stufe lookup_key TAB2 required`, `q_pct lookup_value`, `t_min lookup_value`, `q_zu number l/s required`, `q_ab number l/s required`, `eta_row derived expr "q_ab / q_zu"` (Gl. 3 form — lift), `belastet boolean`; `pruefstoffe` (-03, **create**) → `stoff lookup_key TAB3 required`, `konz lookup_value`, `masse_soll derived expr "konz * V_pruefmedium_l"` (`V_pruefmedium_l` create number), `masse_speicher_g number`, `masse_verwurf_g number visible_when "filtertyp == '<typ_c>'"`; `behaeltnisse` (-02, **create**) → `label text`, `volumen_l number required`, `masse_gefuellt_kg number`, `grifftiefe_cm number visible_when "einbausystem == '<erdeinbau token>'"`; `kennzeichnung` (-04, **create** json) → `select_many` `enum_values` = items a)–i) lifted L692–700.
`sedimentationsvolumen` (-01, **create** enum gross/klein/keines) → `select_one`; `filtertyp` (existing enum, keep_prod) → `lookup_fill` `{ TAB1, role value, keys [{ column 'filterart', from_symbol 'funktionsprinzip' }, { column 'sedimentationsvolumen', from_symbol 'sedimentationsvolumen' }], value 'typ' }` (`din1989_2-D-1`: manual → filled); `dn_nennweite` (-01, **create** enum of the DN sizes the transcript names — only those printed; else `din1989_2-J-1`) → `select_one`; `q_max_en12056` (-01, **create** number) → `reference` widget with `ui_config { document: 'DIN EN 12056-3:2001-01', table: 'Tabelle C.1', note: '<L290 sentence lifted>' }` — the three prod symbols `Q`, `Q_max`, `Q_Zu_max` → inheritance from it (`din1989_2-X-1`).

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| `V_Rueck_A`, `rueckhalteraum_zugaenglich` (-02) | `filtertyp == '<typ_a>'` | Gl. 1 / §5.3.2 (CR-03 guard STAGED `din1989_2-G-1`) |
| `V_Rueck_B`, `behaeltnis_masse`, `tiefe_gok_griff`, `behaeltnisse` (-02) | `filtertyp == '<typ_b>'` | L311–330 (CR-04/05/06 `din1989_2-G-2`) |
| `m_verw`, `eta_Verw`, `eta_C` (-03) | `filtertyp == '<typ_c>'`; `eta_Rueck_AB` `IN {typ_a, typ_b}` | L631 |
| `tiefe_gok_griff` | additionally `einbausystem == '<erdeinbau>'` | L313 |
| `temperaturbestaendig_fallrohr` | `einbau_fallrohr == true` (create boolean) | L256 |
| `werkstoffbezeichnung` (-04) | `werkstoff_filterelement == '<kunststoff>'` | L698 (VR `!= ''` STAGED `din1989_2-G-3`) |
| Filtertrennwirkung block (-03) | `dn_nennweite_le200 == true` — derive from `dn_nennweite` token set (create attestation `dn_le_200` until the DN enum exists) | L227–228 (CR-08/11/17 `din1989_2-G-4`) |

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `DIN-1989-2-02-D1` | -02 | `V_Rueck_A_min = q_max_en12056 * 25`; `V_Rueck_B_min = q_max_en12056 * 2` (25 s / 2 s printed in Gl. 1/2) | `q_max_en12056` | Gl. 1/2 — the existing Gl. 1/2 write into the INPUT symbols → `din1989_2-R-1` (split required vs provided) |
| `DIN-1989-2-03-D1` | -03 | `V_Pruef_leist_calc = q_max_en12056 * 90`; `V_Pruef_trenn_calc = q_max_en12056 * 180` | as named | Gl. 4/6 |
| `DIN-1989-2-03-D2` | -03 | `eta_hydr_unbel = sum_rows(prueflaeufe, if(belastet == false AND stufe == 'p100', eta_row, 0))`; `eta_hydr_bel = …belastet == true…` — the documented η is the value at the printed reference step (which step the text names → lift; else `din1989_2-J-2`) | register | Gl. 3/5 |
| `DIN-1989-2-03-D3` | -03 | `m_ges_festst_calc = sum_rows(pruefstoffe, masse_soll)`; `m_sp_verunr_calc = sum_rows(pruefstoffe, masse_speicher_g)`; `m_verw_calc = sum_rows(pruefstoffe, masse_verwurf_g)` | register | Tab. 3 / L631 (feeding Gl. 7–9 = `din1989_2-R-2`) |
| `DIN-1989-2-03-D4` | -03 | `filtertrennwirkung_code = if(filtertyp == '<typ_c>', if(eta_C >= 0.7, 1, 0), if(eta_Rueck_AB >= 0.7, 1, 0))` (0,7 printed L386) | as named | L386; manual boolean → `din1989_2-D-2` |
| `DIN-1989-2-02-D2` | -02 | `behaeltnis_volumen_sum = sum_rows(behaeltnisse, volumen_l)`; `behaeltnis_masse_max = max_rows(behaeltnisse, masse_gefuellt_kg)` | register | L309 |

- [ ] **Step 6: Emit + tests** (`din1989_2`, `20260917101700` / `…10` / `…20`). Render test: `prueflaeufe` two steps, TAB2 fills, `eta_row`.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `din1989-2-verify`; §5 wins 1 ✓ (guards STAGED), 2 partially (reference; DN enum J-1), 3 ✓, 4 ✓, 5 ✓.

---

### Task 18: DWA-M-820-1 — Schwellenwert chain computed (Anh. B.2.3, §134 GWB), Tab. D.1 insurance lookup, Bewerber/Bieter and Verhandlungsrunden and Lose registers, aggregates for the wired registers

**Inputs:** inventory `…/inventory/DWA-M-820-1.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-1\DWA-M_820-1.md`; harness `tests/harness/m820-1-verify.integration.test.ts`, `seed-m820-1.ts`; prod: 25 worksheets, 120 fields, 0 equations, 26 requirements. Already on the mechanism (Plan-1 configs, `20260911120000_selection_configs_DWA_M_820_1.sql`): `applicable_legal_bases`, `exclusion_124_gwb_selected`, `award_criteria_list`, `stakeholder_list`, `alternatives_considered`, `quality_targets_konzept/projekt`, `bewertungskommission_members`; `risk_register` / `risk_mitigation_plan` are the bespoke editors (Plan 2b migrates them; untouched here — `m820_1-X-1`).

**Estimated size:** tables 4 (TABD1 6 rows; `ANHB23` EU thresholds 2 rows (edition-dated!); `S8_10_3_6` standstill 2 rows; `S3_9_VGV` lot constants 3 rows) / registers 3 new (`bewerber`, `verhandlungsrunden`, `lose`) + 2 re-configs adding `derived`/aggregate columns to the wired `award_criteria_list` (sum) and `bewertungskommission_members` (chair flag) / select_one 1 created (`baukosten_band`? no — derived in the equation by `if()` chain on `estimated_construction_cost`) / lookup_fill 3 (`eu_threshold_value` by `client_organization_type` — statutory, dated; `required_standstill_days` by `electronic_transmission`; Tab. D.1 sums via equation) / field `visible_when` 6 / section 0 / equations 9 new (EQ-A…G + register aggregates) / sign-off ≈ 8 (incl. the EU-threshold edition rule "alle zwei Jahre" — `m820_1-J-1`: the seeded values carry the edition printed in the transcript and a `gueltig_bis` note; a newer regulation is a new edition row). Time saved (§5): five hand-typed threshold fields; four counts from the Bewerber register; insurance sums with audited override; per-bidder negotiation rows; Σ weights = 100, chair, counts.

**Files:** `regulation-tables-seed-m820_1.ts`, `field-configs/m820_1.ts` + prior, `equations/m820_1.ts`, tests, `register-m820-1-bewerber.test.tsx`, STAGED, report; migrations `20260917101800` / `…10` / `…20`.

- [ ] **Step 1: Read.** Transcript l.1329–1330 (thresholds), l.1368 (§3 Abs. 9 VgV), l.1460–1472 (Tab. D.1 + RBBau sentence), §8.10.3.6 (§134 GWB quote), §8.4 (≥2 persons), §8.7, Anh. F §6 (Bewerber table), §8.10 negotiation sentence, "Faktor 1,5" sentence, ±25 % sentence, "Der Preis ist in diesem Fall kein Zuschlagskriterium mehr".

- [ ] **Step 2: Tables** (`standard_code 'DWA-M-820-1'`): `TABD1` keys `baukosten_band` (le0_5/le1_5/le4/le10/le25/le50) values `baukosten_max_mio` (number), `personen_mio`, `sonstige_mio` — `anhaltswert` ("Anhaltspunkt für die Höhe … kann Tabelle D. 1 … geben"; RBBau recommendation; >50 Mio not covered → `m820_1-J-2`); `ANHB23` keys `organisation` (oberste_bundesbehoerde/andere) values `schwellenwert_eur`, `verordnung` (string), `stand` (string) — `locked` (statutory) with `override_quote` "werden … alle zwei Jahre geprüft" (edition rule); `S8_10_3_6` keys `uebermittlung` (elektronisch/sonstige — G-15 boolean tokens `true`/`false`) value `frist_tage` — `locked`; `S3_9_VGV` keys `konstante` (los_dienstleistung/los_bau/anteil_pct) values `wert`, `unit` — `locked`.

- [ ] **Step 3: Registers / selections**

`bewerber` (M820-18, **create**) → `register` columns `name text required`, `p123_ok boolean`, `p124_ok boolean`, `eignung_punkte number`, `shortlisted boolean`, `final_offer boolean`, `winner boolean`; `verhandlungsrunden` (M820-20, **create**) → `runde number required`, `bieter text required` (datalist from `bewerber` rows is G-10 → text), `datum date`, `thema text`, `ergebnis text`, `protokoll_signiert boolean`; `lose` (M820-09, **create**) → `los text required`, `art enum [dienstleistung, bau]`, `netto_wert_eur number required`, `ausnahme boolean`.
`award_criteria_list` (existing wired register) → re-config: same columns + `ist_preis derived expr "if(kriterium == '<Preis token>', 1, 0)"` and `sum_column { key: 'gewichtung', label: 'Σ Gewichtung', unit: '%' }`. `bewertungskommission_members` → add `vorsitz boolean`.
`eu_threshold_value` (existing number) → `lookup_fill` `{ ANHB23, role value, keys [{ column 'organisation', from_symbol 'client_organization_type' }], value 'schwellenwert_eur' }` — prod `client_organization_type` has 6 values vs 2 printed rows: map via a 6-row `ANHB23_MAP` (each row quoting l.1329–1330; mapping of "vergleichbarer Institutionen" is a judgment → `m820_1-J-3`); `required_standstill_days` (existing) → `lookup_fill` `{ S8_10_3_6, keys [{ column 'uebermittlung', from_symbol 'electronic_transmission' }], value 'frist_tage' }`; the four VgV constants (existing editable inputs) → `lookup_fill` on `S3_9_VGV` keyed… constant (G-12) → `derived` equations instead (below) and `m820_1-D-1` (inputs → derived).

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| `procedure_rationale` (M820-10) | `procurement_procedure == '<direktvergabe>'` | "Die Gründe für eine Direktvergabe sind in jedem Fall zu dokumentieren" |
| `publication_date`, `ted_notice_id` (M820-17); `bewertungskommission_*` (M820-16) | `procurement_procedure == '<vgv_f>'` | §8.4 / EU publication |
| `price_weight_percent` (M820-14) | `festpreis_used == false` | "kein Zuschlagskriterium mehr" |
| `min_annual_revenue_multiplier` limit | equation below; REQ-12 STAGED `m820_1-G-1` | Faktor 1,5 |
| `loseausnahme_applicable` | stays; derived (`m820_1-D-2`) | §3 Abs. 9 VgV |
| Bedarfsplanung Konzept vs Projekt (M820-04/-05) | `project_type == '<konzept>'` / `'<projekt>'` | "sowohl für das Konzept als auch für die Projekte" |

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `M820-09-D1` | -09 | `oberschwellig_code = if(estimated_engineering_fee >= eu_threshold_value, 1, 0)` | as named | "Erreicht oder übersteigt …" (REQ-07/08 onto it STAGED `m820_1-G-2`) |
| `M820-09-D2` | -09 | `cost_estimate_near_threshold_code = if(abs(estimated_engineering_fee - eu_threshold_value) * 100 / eu_threshold_value <= cost_estimate_uncertainty_pct, 1, 0)` | as named | ±25 % sentence (`cost_estimate_uncertainty_pct` typed; the 25 is the printed example → `verification_quote`) |
| `M820-13-D1` | -13 | `liability_personen_calc = if(estimated_construction_cost <= lookup('TABD1', 'le0_5', 'baukosten_max_mio') * 1000000, lookup('TABD1', 'le0_5', 'personen_mio'), if(… ≤ le1_5 …, …, …))` — six-step chain, every bound read from the table (no number typed; `1000000` = Mio→EUR unit factor), `liability_sonstige_calc` likewise | `estimated_construction_cost` | Tab. D.1; `anhaltswert` override on the existing input fields = keep them as inputs, add the derived pair (`m820_1-D-3`) |
| `M820-09-D3` | -09 | `lot_value_threshold_services_calc = lookup('S3_9_VGV', 'los_dienstleistung', 'wert')` (+ `_construction`, `_share`) | — | l.1368 |
| `M820-09-D4` | -09 | `lose_exception_sum = sum_rows(lose, if(ausnahme, netto_wert_eur, 0))`; `lose_exception_max = max_rows(lose, if(ausnahme, netto_wert_eur, 0))`; `loseausnahme_code = if(lose_exception_sum * 100 / estimated_engineering_fee <= lot_value_threshold_share_calc AND lose_exception_max <= lot_value_threshold_services_calc, 1, 0)` | register | l.1368 (REQ-24 empty → `m820_1-G-3`) |
| `M820-14-D1` | -14 | `award_weight_sum = sum_rows(award_criteria_list, gewichtung)`; `price_weight_calc = sum_rows(award_criteria_list, if(ist_preis == 1, gewichtung, 0))`; `qualitaets_kriterien_count = count_rows(award_criteria_list, ist_preis == 0)` | register | "Summe = 100 %" note / REQ-15 |
| `M820-16-D1` | -16 | `bewertungskommission_size_calc = count_rows(bewertungskommission_members)`; `chair_count = count_rows(bewertungskommission_members, vorsitz == true)` | register | §8.4 (REQ-09 onto it STAGED) |
| `M820-18-D1` | -18 | `applicant_count_calc = count_rows(bewerber)`; `shortlisted_count_calc = count_rows(bewerber, shortlisted == true)`; `final_offers_count_calc = count_rows(bewerber, final_offer == true)`; `winner_count = count_rows(bewerber, winner == true)` | register | Anh. F §6 (REQ-19 `m820_1-G-4`) |
| `M820-20-D1` | -20 | `negotiation_rounds_calc = max_rows(verhandlungsrunden, runde)` | register | REQ-20 |
| `M820-03-D1` | -03 | `stakeholder_roles_covered = …` — per §5 role: `count_rows(stakeholder_list, rolle == '<role>') >= 1` ×5 as booleans (`if(…, 1, 0)`), sum → REQ-04 (empty today, `m820_1-G-5`) | register | §5.1–5.6 |
| `M820-23-D1` | -23 | `contract_invalidity_code = if(information_letters_sent == false, 1, 0)` | as named | §135 GWB sentence |

- [ ] **Step 6: Emit + tests** (`m820_1`, `20260917101800` / `…10` / `…20`). Render test: `bewerber` two rows, counts through `evaluateFormula`.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `m820-1-verify`; §5 wins 1 ✓ (edition rule J-1), 2 ✓, 3 ✓, 4 ✓, 5 ✓.

---

### Task 19: DWA-M-820-2 — Testbetrieb/Abnahme gate pair conditional, Gewährleistungskalender, Entscheidungs-Register, LOP, Auflagen, Vergabe-je-Los, Anhang-A/B outline checklists, VOB/BIM/innovation conditionals

**Inputs:** inventory `…/inventory/DWA-M-820-2.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-820-2\DWA-M_820-2.md` (Anhang A l.2523ff, Anhang B l.2559ff); harness `tests/harness/m820-2-verify.integration.test.ts`, `seed-m820-2.ts`; prod: 28 worksheets, 113 fields, 0 equations, 59 requirements. Wired (Plan-1 configs): 11 registers/checklists — untouched except `change_orders` (aggregate equations added on the same config).

**Estimated size:** tables 2 (`ANHANGA` 19 + 2 annex rows; `ANHANGB` 8 rows — outline catalogues, G-2) / registers 5 new (`entscheidungen`, `gewaehrleistungen`, `offene_punkte`, `auflagen`, `vergaben_los`) + 1 (`dritte`) + 2 checklists (`projekthandbuch_kapitel`, `statusbericht_abschnitte` as `select_many` with `enum_values` = the printed outlines) / select_one 1 created (`einleitung_vorhanden` boolean → attestation) / lookup_fill 0 / field `visible_when` 8 / section 0 / equations 8 new / sign-off ≈ 8 (incl. `lph_completed` value-format mismatch — `m820_2-E-1`, D-1 keeps prod). Time saved (§5): REQ-46/47 stop mis-firing; warranty per Auftragnehmer; decisions/lots/LOP/Auflagen as rows; outlines as checklists.

**Files:** `regulation-tables-seed-m820_2.ts`, `field-configs/m820_2.ts` + prior, `equations/m820_2.ts`, tests, `register-m820-2-gewaehrleistung.test.tsx`, STAGED, report; migrations `20260917101900` / `…10` / `…20`.

- [ ] **Step 1: Read.** Transcript l.1134 (Entscheidungsdokumentation), l.1798/1812 (Abnahme je Auftragnehmer; Gewährleistungskalender), §4.3.7 LOP, §5.4.1 Auflagen, §4.3.6 Berichtsturnus, §4.2 Zyklus, §5.6.4/5 change orders, §7.5/7.6 innovations, §8.3.2 BIM, Testbetrieb/Abnahme sentence, Anhang A/B outlines. Capture prior (`testbetrieb_vs_abnahme_choice` tokens, `vob_applicable`, `contract_type`, `project_category`, `innovation_scope_defined`, `bim_basics_established`).

- [ ] **Step 2: Tables** (`standard_code 'DWA-M-820-2'`): `ANHANGA` keys `abschnitt` (a1…a9_2, anhang1, anhang2) values `titel` (string), `nummer` (string) — `anhaltswert` ("Ein erster Gliederungsvorschlag"); `ANHANGB` keys `kapitel` (b1…b8) values `titel` — `anhaltswert`. Both `md_verified` (short, verbatim).

- [ ] **Step 3: Registers / selections**

`entscheidungen` (820-2-12, **create**) → `nr number required`, `datum date required`, `entscheidung text required`, `begruendung text`, `entscheider text`; `gewaehrleistungen` (820-2-24, **create**) → `auftragnehmer text required`, `abnahme date required`, `beginn date required`, `ende date required`, `maengel_offen number min 0`; `offene_punkte` (820-2-06, **create**) → `punkt text required`, `verantwortlich text`, `termin date`, `status enum [offen, erledigt]`; `auflagen` (820-2-16, **create**) → `auflage text required`, `genehmigung text` (G-10 flattening of `permit_inventory_complete` rows), `frist date`, `erledigt boolean`; `vergaben_los` (820-2-19, **create**) → `los text required`, `verfahren text`, `zuschlag date`, `auftragswert number EUR required`; `dritte` (820-2-13, **create**) → `leistung text required`, `buero text`, `beauftragt date`.
`projekthandbuch_kapitel` (820-2-05, **create** json) → `select_many` `enum_values` = ANHANGB titles (lifted); `statusbericht_abschnitte` (820-2-06, **create** json) → `select_many` `enum_values` = ANHANGA titles. `einleitung_vorhanden` (820-2-16, **create** boolean) → `attestation` (driver for `discharge_permit_extension`).
`change_orders` (wired) → unchanged config; aggregates below.

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| `testbetrieb_planned` block (820-2-22) | `testbetrieb_vs_abnahme_choice IN {<testbetrieb token>, <mischform token>}` | "ob er sich für den Testbetrieb mit anschließender Abnahme, die Abnahmeprüfungen ohne Testbetrieb oder eine Mischform …" (REQ-46/47 guards STAGED `m820_2-G-1` — the top win) |
| `abnahme_per_bild4` block | `testbetrieb_vs_abnahme_choice IN {<abnahme token>, <mischform token>}` | same |
| `discharge_permit_extension` | `einleitung_vorhanden == true` | REQ-35 "Where applicable" (guard STAGED `m820_2-G-2`) |
| `nebenangebote_conditions`, `eignungskriterien_set`, `leistungsbeschreibung_type` (820-2-17/18) | `vob_applicable == true` | VOB/A sentence (REQ-38/39/40 `m820_2-G-3`) |
| BIM fields (820-2-27/28) | `bim_basics_established == true` | §8.3.2 (REQ-59 empty `m820_2-G-4`) |
| `hoai_compliance` | `contract_type == '<planning token>'` | §2.2/§4.6 |
| `liability_clarified`, `ip_rights_defined` (820-2-26) | `innovation_scope_defined == true` | §7.5/7.6 (REQ-56 `m820_2-G-5`) |
| Bedarfsplanung Konzept/Projekt (820-2-11) | `project_category == '<konzept>'` / `'<projekt>'` | quote |
| `lph_completed ⊆ included_hoai_phases` | both `select_many` → `m820_2-M-1` (gate proposal with `contains()`) | §1 |

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `820-2-21-D1` | -21 | `change_orders_count = count_rows(change_orders)`; `change_orders_sum = sum_rows(change_orders, kosten_eur)`; `change_orders_open = count_rows(change_orders, status == '<offen token>')` | register | §5.6.4/5 (Anh. A 4.3) |
| `820-2-12-D1` | -12 | `decisions_count = count_rows(entscheidungen)` | register | l.1134 (REQ-25 `m820_2-G-6`) |
| `820-2-24-D1` | -24 | `warranty_open_defects = sum_rows(gewaehrleistungen, maengel_offen)`; `warranty_count = count_rows(gewaehrleistungen)`; earliest/latest dates → G-5 `m820_2-F-1` | register | l.1812 (REQ-51 `m820_2-G-7`) |
| `820-2-06-D1` | -06 | `lop_open = count_rows(offene_punkte, status == 'offen')` | register | §4.3.7 |
| `820-2-16-D1` | -16 | `auflagen_offen = count_rows(auflagen, erledigt == false)` | register | §5.4.1 |
| `820-2-19-D1` | -19 | `final_contract_value_calc = sum_rows(vergaben_los, auftragswert)`; `lots_count = count_rows(vergaben_los)` | register | §5.5 (feeds Teil 1 Loseausnahme — Phase 6 `m820_2-X-1`) |
| `820-2-13-D1` | -13 | `third_parties_count = count_rows(dritte)` | register | §? "Bedarf an Fachplanungen …" |

- [ ] **Step 6: Emit + tests** (`m820_2`, `20260917101900` / `…10` / `…20`). Render test: `gewaehrleistungen` two rows; `change_orders` sum through `evaluateFormula`.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `m820-2-verify`; §5 wins 1 ✓ (guards STAGED), 2 ✓ (dates F-1), 3 ✓, 4 ✓, 5 ✓.

---

### Task 20: ISO-5667-10 — schedule rows from Formula 1/2, `composite_mode` switch with Formula 3 bottle rows, `specific_site_type` blocks, context-switched limits (5/30 min, 0,5/0,3 m/s, 50/25 ml), shared QA block recorded

**Inputs:** inventory `…/inventory/ISO-5667-10.md`; transcript `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 5667-10\ISO-5667-10.txt` (**Spanish txt — VC; quote in Spanish, add the clause number**); harness `tests/harness/iso5667-10-verify.integration.test.ts`, `seed-iso5667-10.ts`; prod: 10 worksheets, 81 fields, 3 equations, 36 requirements.

**Estimated size:** tables 5 text tables (`S4_3_2` formula switch 2 rows; `S7_2_1` interval 2 rows; `S7_2_2_1_TUBE` 2 rows; `S7_2_2_1_PUMP` 2 rows (pump-volume sentence NOT located in the Spanish txt per inventory → seed only if found, else `iso5667_10-U-1`); `S7_2_2_4` CV 20 % 1 row) / registers 5 (`probenahmestellen`, `probenahmetermine`, `flaschen_ctcv`, `stichproben_qualifiziert`, `probenahmegeraete`) / select_one 2 created (`composite_duration_band` 2h/24h; `sampling_period_year` boolean) / lookup_fill 4 (interval, suction velocity, unit volume, A-range) / field `visible_when` 12 / section 0 / equations 6 new + 1 staged (Formula 1/2 as row generator) / sign-off ≈ 8. Time saved (§5): schedule generated; composite block by mode; site-type blocks; switched limits; QA block shared (Phase 6 `iso5667_10-X-1`).

**Files:** `regulation-tables-seed-iso5667_10.ts`, `field-configs/iso5667_10.ts` + prior, `equations/iso5667_10.ts`, tests, `register-iso5667-10-termine.test.tsx`, STAGED, report; migrations `20260917102000` / `…10` / `…20`.

- [ ] **Step 1: Read.** txt l.285, l.478–500 (Formulas 1/2 + A range), l.861–862, l.903/922, l.958–1025 (Formula 3, CV 20 %), l.1110, l.1567, §3.4 (qualified grab), §4.2, §5.1–5.4, §7.4/8.4, §11.1. Capture prior (`composite_mode`, `specific_site_type`, `pump_technology`, `main_sampling_type`, `representativeness_mode`, `sample_type_definition`).

- [ ] **Step 2: Tables** (`standard_code 'ISO-5667-10'`): `S4_3_2` keys `n_band` (gt25/lt25) values `formula` (string "1"/"2"), `period_unit` (string dias/semanas), `period_length` (number 365/52), `a_min_factor` (string "-365/n"/"-52/n") — `locked`; `S7_2_1` keys `duration` (h2/h24) value `max_interval_min` — `locked` ("No deben superar"); `S7_2_2_1_TUBE` keys `bore_band` (ge9/ge12) value `min_velocity_m_s` — `locked`; `S7_2_2_1_PUMP` keys `pump` (vacuum/inline_piston) value `min_unit_volume_ml` — `locked`, only if located; `S7_2_2_4` single row `cv_max_pct`.

- [ ] **Step 3: Registers / selections**

`probenahmestellen` (ISO-5667-10-02, **create**) → `id text required`, `location text`, `coordinates text`, `flow_type enum [<prod tokens>]`, `specific_site_type enum [<prod tokens>] discriminator`, `well_mixed boolean`, `sampling_depth_fraction number visible_when "specific_site_type == '<sewer>'"`, `restriction_downstream_diameters number visible_when "specific_site_type == '<sewer>'"`, `wwtp_objective text visible_when "specific_site_type == '<wwtp>'"`, `bypass_assessed boolean visible_when "specific_site_type == '<wwtp>'"`, `cooling_type enum visible_when "specific_site_type == '<cooling>'"`, `cooling_runoff_s number visible_when "specific_site_type == '<cooling>'"`, `upstream_of_biocide boolean visible_when "specific_site_type == '<cooling>'"`.
`probenahmetermine` (-03, **create**) → `k number required min 1`, `day_or_week derived expr "A + period_length * k / number_of_samples"` (Formula 1/2 form lifted; `period_length` = `lookup('S4_3_2', if(number_of_samples > 25, 'gt25', 'lt25'), 'period_length')` — the "unas 25" boundary is the printed sentence; G-13 worksheet symbols `A`, `number_of_samples`), `date_planned date`, `done boolean`. The n rows are added by the engineer (no row generator in the editor — `iso5667_10-F-1`, Plan-2b follow-up "generate n rows").
`flaschen_ctcv` (-06, **create**) → `n number required`, `m3_n number required min 0`, `v_n derived expr "V_final * m3_n / M3_total"` (Formula 3 lifted), `visible` only when `composite_mode == '<ctcv>'` (register field `visible_when`).
`stichproben_qualifiziert` (-01, **create**) → `time text required` (no time arithmetic — G-5; count only), `volume_ml number`; `probenahmegeraete` (-07, **create**) → `label text`, `mobility enum`, `pump_technology enum [<prod tokens>] discriminator`, `unit_volume_ml number`, `unit_volume_min derived expr "lookup('S7_2_2_1_PUMP', pump_technology, 'min_unit_volume_ml')"`, `refrigerated boolean`, `material_compatible boolean`, `cleaned_checked boolean`.
`composite_duration_band` (-06, **create** enum h2/h24) → `select_one`; `composite_interval_max` (create number) → `lookup_fill` role `limit` ← `S7_2_1` by `composite_duration_band`; `tube_bore_band` (create enum ge9/ge12 — or derived from `tube_internal_diameter` in an equation: `suction_velocity_min = lookup('S7_2_2_1_TUBE', if(tube_internal_diameter >= 12, 'ge12', 'ge9'), 'min_velocity_m_s')` — printed bounds) → equation form (G-9).

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| `grab_method` (-05) | `main_sampling_type == '<grab>'`; composite fields `== '<composite>'` | §6 |
| `sampler_flow_linked` | `composite_mode IN {<cvvt>, <ctvv>}` | §7.2.2.2/3 |
| `V_final`, `M3_total`, `flaschen_ctcv`, CV field | `composite_mode == '<ctcv>'` | §7.2.2.4 |
| Formula 1 fields / Formula 2 fields (-03) | `sampling_period == '<year>'` (and n band inside the equation) | §4.3.2 |
| `qualified_grab_*` (-01) | `sample_type_definition == '<qualified_grab>'` | §3.4 |
| `tank_mixing_*`, `homogeneity_deviation` (-02/-07) | `representativeness_mode == '<in_storage>'` | §7.4/§8.4 (CR-021 guard STAGED `iso5667_10-G-1`) |
| `homogenizer_type` mechanical rule | gate STAGED on `collected_volume > 5` (`iso5667_10-G-2`) | CR-025 text |
| `event_triggered_*` | `event_triggered_sampling == true` | §7.3.4 |

STAGED: CR-016/017/018 two-branch rules onto the derived limits (`iso5667_10-G-3…5`); CR-011/012 site-type guards (`-G-6`).

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `ISO-5667-10-03-D1` | -03 | `period_length_calc = lookup('S4_3_2', if(number_of_samples > 25, 'gt25', 'lt25'), 'period_length')`; `A_min_calc = 0 - period_length_calc / number_of_samples`; `A_in_range = if(A >= A_min_calc AND A <= 0, 1, 0)` | as named | §4.3.2 |
| `…-03-D2` | -03 | `termine_count = count_rows(probenahmetermine)`; `termine_done = count_rows(probenahmetermine, done == true)` | register | CR-008 |
| `…-06-D1` | -06 | `v_n_sum = sum_rows(flaschen_ctcv, v_n)`; `m3_n_sum = sum_rows(flaschen_ctcv, m3_n)` (checks Σ = V_final / M3_total) | register | Formula 3 |
| `…-06-D2` | -06 | `suction_velocity_min = lookup('S7_2_2_1_TUBE', if(tube_internal_diameter >= 12, 'ge12', 'ge9'), 'min_velocity_m_s')` | `tube_internal_diameter` | §7.2.2.1 |
| `…-01-D1` | -01 | `qualified_grab_count_calc = count_rows(stichproben_qualifiziert)` | register | §3.4 (window/interval need time arithmetic → `iso5667_10-F-2`) |
| `…-07-D1` | -07 | `geraete_unit_volume_fail = count_rows(probenahmegeraete, unit_volume_ml < unit_volume_min)` | register | §7.2.2.1 |

- [ ] **Step 6: Emit + tests** (`iso5667_10`, `20260917102000` / `…10` / `…20`). Render test: `probenahmestellen` two rows (sewer vs cooling), discriminator columns.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `iso5667-10-verify`; §5 wins 1 partially (rows entered, F-1 generator), 2 ✓, 3 ✓, 4 ✓, 5 Phase 6.

---
### Task 21: ISO-59020 — inflow/outflow/energy/water rows (one per flow X) with A.1–A.13 per row, Table 3 indicator register with mandatory flags, linear shares derived, data-source register

**Inputs:** inventory `…/inventory/ISO-59020.md`; transcript `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 59020\ISO-59020-Unlocked.txt` (**txt — VC**; Table 3 at l.1081ff, Annex A formulas); harness `tests/harness/iso59020-verify.integration.test.ts`, `seed-iso59020.ts`; prod: 9 worksheets, 83 fields, 13 equations, 37 requirements.

**Estimated size:** tables 1 (`TABLE3` 13 indicator rows: category, mandatory flag, clause, name, principle — the three "continued" rows re-verified from the txt or left out `iso59020-U-1`) / registers 5 (`inflows`, `outflows`, `energy_flows`, `indicators`, `data_sources`) + `complementary_methods`, `additional_indicators` / select_one 0 / lookup_fill 0 / field `visible_when` 6 (energy/water/economic blocks by indicator selection — driver is the register → `contains()`-like → sign-off `iso59020-M-1`; fail-safe: blocks stay visible) / section 0 / equations 10 new (per-row versions of A.1–A.7 as derived columns; aggregates + linear shares) + 13 staged (the existing single-X equations become per-row — `iso59020-R-1` lists all 13) / sign-off ≈ 8. Time saved (§5): the whole method (per-X rows); indicator register derives `mandatory_core_indicators_included`; linear shares derived; water inheritance (Phase 6); data-source rows.

**Files:** `regulation-tables-seed-iso59020.ts`, `field-configs/iso59020.ts` + prior, `equations/iso59020.ts`, tests, `register-iso59020-inflows.test.tsx`, STAGED, report; migrations `20260917102100` / `…10` / `…20`.

- [ ] **Step 1: Read.** txt l.1081ff (Table 3 completely), Annex A.2.2–A.6.3 formulas (each as printed), §7.3.1 / §A.1 ("count the indicator value as zero"), §A.3.4 ("if no traceable data, record 0%"), §7.5 / Annex G aggregation (quote the rule — if the aggregation is defined, `iso59020-J-1` asks whether a weighted mean is that rule), §A.4.2 common energy unit, §7.6.1.2/§7.6.2.

- [ ] **Step 2: Tables** (`standard_code 'ISO-59020'`): `TABLE3` keys `indicator` (a_2_2 … a_6_3 — 13 tokens; prod `selected_core_indicator` enum has 13 values, D-1: use its tokens) values `category` (string), `mandatory` (boolean), `name` (string), `principle` (string) — `locked` ("If a core circularity indicator is not applicable, the organization should explain why and can count the indicator value as zero"). `md_verified` if all 13 lift; else partial.

- [ ] **Step 3: Registers**

`inflows` (ISO-59020-05, **create**) → `register`:
```json
{ "title": "Resource inflows X", "subtitle": "Annex A.2 — one row per inflow X; content fractions per A.2.2–A.2.4", "add_label": "+ inflow",
  "columns": [
    { "key": "label", "label": "Inflow X", "type": "text", "required": true },
    { "key": "m_ti", "label": "m_TI", "type": "number", "unit": "t", "required": true, "min": 0 },
    { "key": "m_reui", "label": "m_REUI", "type": "number", "unit": "t", "required": true, "min": 0 },
    { "key": "m_reci", "label": "m_RECI", "type": "number", "unit": "t", "required": true, "min": 0 },
    { "key": "m_reni", "label": "m_RENI", "type": "number", "unit": "t", "required": true, "min": 0 },
    { "key": "pct_reui", "label": "% reused (A.2.2)", "type": "derived", "expr": "m_reui / m_ti * 100" },
    { "key": "pct_reci", "label": "% recycled (A.2.3)", "type": "derived", "expr": "m_reci / m_ti * 100" },
    { "key": "pct_reni", "label": "% renewable (A.2.4)", "type": "derived", "expr": "m_reni / m_ti * 100" },
    { "key": "pct_linear", "label": "% linear", "type": "derived", "expr": "100 - pct_reui - pct_reci - pct_reni" },
    { "key": "balanced", "label": "balanced", "type": "derived", "expr": "if(m_reui + m_reci + m_reni <= m_ti, 1, 0)" }
  ] }
```
(the `× 100` and the four-way balance are printed in A.2.x / "shall be fully balanced" — lifted.)
`outflows` (-06, **create**) → same pattern with `m_to`, `m_reuo`, `m_reco`, `m_reno`, `t_lp`, `t_ialp`, derived `pct_reuo`, `pct_reco`, `pct_reno`, `rlp` (`t_lp / t_ialp`), `pct_linear`; `traceable_recycling boolean` with `pct_reco derived expr "if(traceable_recycling, m_reco / m_to * 100, 0)"` (§A.3.4).
`energy_flows` (-07, **create**) → `label text`, `unit enum [MJ, kWh]` (must equal the worksheet's `energy_unit_common` — per-row check derived `unit_ok`), `ei_rene`, `eo_rene`, `ei_te`, `eo_te` numbers, `pct_econre derived expr "(ei_rene - eo_rene) / (ei_te - eo_te) * 100"` (A.8 as printed).
`indicators` (-04, **create**) → `indicator lookup_key TABLE3 required`, `mandatory lookup_value {TABLE3, indicator, mandatory}`, `selected boolean`, `applicable boolean`, `justification text visible_when "applicable == false"`, `value number`, `ok derived expr "if(mandatory == 1 AND selected == false AND applicable == true, 0, 1)"` (a boolean `lookup_value` compared as `== 1`/`== true` — G-15 note; the executor tests which literal `prepareRegisterRows` yields for a boolean table cell and uses that).
`data_sources` (-08, **create**) → `component text required`, `source text`, `data_category enum [<prod tokens>]`, `traceable boolean`; `complementary_methods` (-09, **create**) → `method text` (datalist from §3.3.7 examples lifted), `reference text`; `additional_indicators` (-04, **create**) → `name text`, `definition text`, `value number`.

- [ ] **Step 4: Conditionals** — `indicator_not_applicable_justified` etc. stay; blocks (-07 energy/water/economic) visibility keyed on the `indicators` register → `iso59020-M-1` (proposal: `count_rows(indicators, indicator IN {a_4_2} AND selected == true) > 0`); `temporal_boundary_note` (-09) `visible_when "temporal_boundary_shortened == true"`; `information_verifiable` (-09) `visible_when "internal_or_external_use == '<external token>'"`; `consolidation`/`aggregation_method` `visible_when "system_level == '<multi token>'"` (§6.5). STAGED: CR-020…025 onto the register count (`iso59020-G-1`); CR-008/010/036/037 empty conditions (`iso59020-G-2`); CR-014/019 onto `balanced` (`iso59020-G-3`).

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `ISO-59020-05-D1` | -05 | `m_ti_total = sum_rows(inflows, m_ti)`; `pct_reci_agg = sum_rows(inflows, m_reci) * 100 / m_ti_total` (mass-weighted — only if §7.5/Annex G prints that rule, else `iso59020-J-1` and the equation stays out) ; `pct_reui_agg`, `pct_reni_agg` likewise; `inflows_unbalanced = count_rows(inflows, balanced == 0)` | register | A.2.x / §7.5 |
| `…-06-D1` | -06 | same for outflows (`pct_reuo_agg`, `pct_reco_agg`, `pct_reno_agg`, `rlp_mean = mean_rows(outflows, rlp)`) | register | A.3.x |
| `…-07-D1` | -07 | `pct_econre_agg = (sum_rows(energy_flows, ei_rene) - sum_rows(energy_flows, eo_rene)) / (sum_rows(energy_flows, ei_te) - sum_rows(energy_flows, eo_te)) * 100`; `energy_unit_mismatch = count_rows(energy_flows, unit_ok == 0)` | register | A.4.2 |
| `…-04-D1` | -04 | `mandatory_missing = count_rows(indicators, ok == 0)`; `mandatory_core_indicators_included_code = if(mandatory_missing == 0, 1, 0)` | register | §7.3 |
| `…-08-D1` | -08 | `data_sources_untraceable = count_rows(data_sources, traceable == false)` | register | §7.6.2 |

The 13 existing single-X equations (A.1–A.13) stay untouched; `iso59020-R-1` proposes retiring A.1–A.8 for the row versions once the owner ratifies (their outputs `pct_*_X` are consumed by -09 → consumer edits included in the proposal). Water (A.9–A.11) and economic (A.12–A.13) stay scalar (site-level).

- [ ] **Step 6: Emit + tests** (`iso59020`, `20260917102100` / `…10` / `…20`). Render test: `inflows` two rows, per-row percentages.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `iso59020-verify`; §5 wins 1 ✓, 2 ✓ (block gating M-1), 3 ✓, 4 Phase 6, 5 ✓.

---

### Task 22: ISO-46001 — water-balance register (streams with roles) replacing WD/R1–R3/O1–O4 slots, objectives and targets registers, `water_efficiency_indicator` computed with Table D.1 sector hint, SEU/source/legal/party/NC registers

**Inputs:** inventory `…/inventory/ISO-46001.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\_site_audit\ISO-46001\_46001_raw.txt` with `_46001_layout.txt` (**raw txt — Table D.1 pairing verified against the layout file before any row is lifted; if the layout file does not settle a pair, the row is NOT seeded → `iso46001-U-1`**); harness `tests/harness/iso46001-verify.integration.test.ts`, `seed-iso46001.ts`; prod: 10 worksheets, 97 fields, 4 equations, 40 requirements.

**Estimated size:** tables 2 (`TABLED1` ≈20 sector rows; `TABLEA1` monitoring areas catalogue ≈ rows as printed) / registers 9 (`water_streams`, `objectives`, `targets`, `significant_uses`, `water_sources`, `indicators_46001`, `legal_requirements`, `interested_parties_46001`, `nonconformities`) + `monitoring_items` checklist / select_one 1 created (`industry_sector` enum = TABLED1 keys) / lookup_fill 1 (`business_activity_indicator_hint` text ← TABLED1 by `industry_sector`, role `value`, `anhaltswert`) / field `visible_when` 5 / section 0 / equations 6 new + 4 staged (C.1/C.2/C.3/C.5 onto the register) / sign-off ≈ 7. Time saved (§5): one entry per meter; objectives rows; indicator computed; targets rows; site water inheritance (Phase 6 `iso46001-X-1`).

**Files:** `regulation-tables-seed-iso46001.ts`, `field-configs/iso46001.ts` + prior, `equations/iso46001.ts`, tests, `register-iso46001-streams.test.tsx`, STAGED, report; migrations `20260917102200` / `…10` / `…20`.

- [ ] **Step 1: Read.** raw l.899 (Table A.1), l.1106–1166 (Annex C: C.1–C.5 formulas and the leak sentence), l.1192–1200 (Table D.1) + the same region in `_46001_layout.txt`, §6.2.1 1)–5), §6.2.3, §6.2.4 1)/2), §6.2.5–6.2.7, §6.3, §9.1 seven items, §10.1, §8.2/§8.3.

- [ ] **Step 2: Tables** (`standard_code 'ISO-46001'`): `TABLED1` keys `sector` (tokens per printed row) values `indicator_text` (string) — `anhaltswert` ("Examples of business activity indicators"); `TABLEA1` keys `area` values `description` — `anhaltswert` ("indicates areas … where water use can be significant").

- [ ] **Step 3: Registers**

`water_streams` (ISO-46001-08, **create**) → `register`:
```json
{ "title": "Water balance (Annex C)", "subtitle": "one row per metered stream — role decides which C.x term it enters", "add_label": "+ stream",
  "columns": [
    { "key": "label", "label": "Stream / meter", "type": "text", "required": true },
    { "key": "role", "label": "Role", "type": "enum", "options": ["wd", "r_other_source", "output", "rp", "rnp", "wp", "rpp"], "required": true, "discriminator": true },
    { "key": "volume_m3", "label": "Volume", "type": "number", "unit": "m³", "required": true, "min": 0 },
    { "key": "period", "label": "Period", "type": "text" },
    { "key": "source_type", "label": "Source type", "type": "enum", "options": ["drinking", "reclaimed", "alternative"], "visible_when": "role IN {wd, r_other_source}" }
  ] }
```
(role tokens follow the Annex C symbols: WD, R1–R3 (other sources), O1–O4 (outputs), Rp, Rnp, Wp, Rpp — each defined in the C.x legends, lifted into the config quote.)
`objectives` (-03, **create**) → `objective text required`, `what text`, `resources text`, `responsible text`, `deadline date`, `evaluation_method text`; `targets` (-05, **create**) → `target text required`, `function_level text`, `time_frame text`, `action_plan text`, `verification_method text`, `result_verification text`; `significant_uses` (-04, **create**) → `activity text required`, `facility text`, `m3_per_a number`, `share_pct derived expr "m3_per_a * 100 / seu_total"` (needs `seu_total` equation — circular within the same register? `sum_rows` cannot be referenced from a row → `share_pct` stays worksheet-level: `seu_share_max` equation instead; `iso46001-F-1`); `water_sources` (-04, **create**) → `source text required`, `type enum [drinking, reclaimed, alternative]`, `m3_per_a number`; `indicators_46001` (-04, **create**) → `indicator text required`, `unit text`, `period text`, `value number`, `baseline number`; `legal_requirements` (-03, **create**) → `requirement text required`, `source text`, `review_date date`; `interested_parties_46001` (-01, **create**) → `party text required`, `requirement text`; `nonconformities` (-10, **create**) → `nc text required`, `cause text`, `action text`, `evidence text`, `closed boolean`; `monitoring_items` (-09, **create** json) → `select_many` `enum_values` = the seven §9.1 items lifted.
`industry_sector` (-04, **create** enum = TABLED1 keys) → `select_one`; `business_activity_indicator_hint` (-04, **create** text) → `lookup_fill` `{ TABLED1, role value, keys [{ column 'sector', from_symbol 'industry_sector' }], value 'indicator_text' }`.

- [ ] **Step 4: Conditionals** — `plant_recycling_rate`, `process_recycling_rate` `visible_when` cannot key on rows → stay visible; `baseline_water_efficiency_indicator` re-establish note `visible_when "baseline_adjustment_trigger IS NOT NULL"`; `design_consideration` (-07) → `visible_when "designing_new_facilities == true"` (create boolean, §8.2 "when designing new/modified/renovated facilities with significant impact"); `procurement_criteria`, `supplier_informed` (-06) → `visible_when "procurement_significant == true"` (create boolean, §8.3). STAGED: CR-027/028 guards (`iso46001-G-1/2`); CR-036/039/040 empty (`iso46001-G-3`); CR-037/038 onto the equations (`iso46001-G-4`).

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `ISO-46001-08-D1` | -08 | `Win_calc = sum_rows(water_streams, if(role IN {wd, r_other_source}, volume_m3, 0))`; `Wout_calc = sum_rows(water_streams, if(role == 'output', volume_m3, 0))`; `leak_indicator = Win_calc - Wout_calc` | register | C.1/C.2 + "Should total water input exceed total water output …" (C.1/C.2b onto the register `iso46001-R-1`) |
| `…-08-D2` | -08 | `plant_recycling_rate_calc = (sum_rows(water_streams, if(role == 'rp', volume_m3, 0)) + sum_rows(water_streams, if(role == 'rnp', volume_m3, 0))) / (sum_rows(water_streams, if(role == 'rp', volume_m3, 0)) + sum_rows(water_streams, if(role == 'rnp', volume_m3, 0)) + sum_rows(water_streams, if(role == 'wd', volume_m3, 0))) * 100` | register | C.3 (as printed) |
| `…-08-D3` | -08 | `process_recycling_rate_calc = sum_rows(water_streams, if(role == 'rp', volume_m3, 0)) / (sum_rows(water_streams, if(role == 'wp', volume_m3, 0)) + sum_rows(water_streams, if(role == 'rpp', volume_m3, 0))) * 100` | register | C.5 |
| `…-04-D1` | -04 | `water_efficiency_indicator_calc = Win_calc / business_activity_indicator_value` | as named | 3.33 definition (`past_present_water_use` ≡ `Win` → `iso46001-X-2`) |
| `…-03-D1` | -03 | `objectives_count = count_rows(objectives)`; `targets_count = count_rows(targets)`; `nc_open = count_rows(nonconformities, closed == false)` | registers | §6.2.1/§6.3/§10.1 |
| `…-04-D2` | -04 | `seu_total = sum_rows(significant_uses, m3_per_a)`; `seu_share_max = max_rows(significant_uses, m3_per_a) * 100 / seu_total` | register | §6.2.4 |

- [ ] **Step 6: Emit + tests** (`iso46001`, `20260917102200` / `…10` / `…20`). Render test: `water_streams` two rows (wd + output), `Win_calc`/`Wout_calc` through `evaluateFormula`.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `iso46001-verify`; §5 wins 1 ✓, 2 ✓, 3 ✓ (Table D.1 partial if pairing unresolved), 4 ✓, 5 Phase 6.

---

### Task 23: ISO-5667-6 — sampling points as rows with §7 location-type checks, heterogeneity-test and travel-time rows with computed counts, Annex A mixing distance (g fixed), §13.1 report checklist, shared QA block recorded

**Inputs:** inventory `…/inventory/ISO-5667-6.md`; transcript `C:\Users\Ekowai\Desktop\Ciruclar economy, sustanability and water test\ISO 5667-6\ISO-5667-6-2015.txt` (**Spanish txt — VC**); harness `tests/harness/iso5667-6-verify.integration.test.ts`, `seed-iso5667-6.ts`; prod: 13 worksheets, 76 fields, 1 equation (+1 identity), 30 requirements.

**Estimated size:** tables 2 text tables (`ANNEXA` 1 row: Chézy range 15<c<50 + the two example values as `anhaltswert`; `S13_1` 17 report items catalogue) / registers 5 (`sampling_points_6`, `heterogeneity_samples`, `travel_time_runs`, `increments`, `report_items_6` as `select_many`) / select_one 1 created (`bed_roughness_hint` enum from the two printed examples — `anhaltswert`, SR-2 for c) / lookup_fill 1 (`c_hint` ← ANNEXA by `bed_roughness_hint`) / field `visible_when` 9 / section 0 / equations 5 new + 2 staged (Annex A formula √g ambiguity — `iso5667_6-U-1`, the existing Eq. A.1 is NOT rewritten until the PDF settles it; Eq. 2 identity → deactivate proposal) / sign-off ≈ 7. Time saved (§5): points as rows with per-row checks; counts computed; mixing distance once; checklist; QA block shared (Phase 6 `iso5667_6-X-1`).

**Files:** `regulation-tables-seed-iso5667_6.ts`, `field-configs/iso5667_6.ts` + prior, `equations/iso5667_6.ts`, tests, `register-iso5667-6-points.test.tsx`, STAGED, report; migrations `20260917102300` / `…10` / `…20`.

- [ ] **Step 1: Read.** txt l.859 (travel time ≥5 flows, ≤10 % extrapolation), l.899 (≈6 samples, ≥3 flows, ~90 %-flow part), l.1052 (5 ± 3 °C), l.1168/1285/1311 (30 cm), l.1404 (0,5–3,0 m/s), l.2146–2188 (Annex A), §7.1–7.5, §10.8 (<5 min), §13.1 a)–q), §15 ice.

- [ ] **Step 2: Tables** (`standard_code 'ISO-5667-6'`): `ANNEXA` keys `roughness` (muy_irregular/liso — the two example descriptions, lifted) values `c_example` (number), `c_min`, `c_max` — `anhaltswert` (Annex A informative; "15 < c < 50"); `S13_1` keys `item` (a…q) values `text` — `anhaltswert` ("should consider for inclusion").

- [ ] **Step 3: Registers**

`sampling_points_6` (ISO-5667-6-02, **create**) → `register` columns `id text required`, `coordinate text`, `depths text`, `location_type enum [<prod sampling_location_type tokens>] required discriminator`, `bridge_position enum [upstream, downstream] visible_when "location_type == '<bridge>'"`, `bridge_checks boolean visible_when "location_type == '<bridge>'"`, `ppe_high_visibility boolean visible_when "location_type IN {<wading>, <bank>}"`, `ice_safety boolean visible_when "location_type == '<under_ice>'"`, `homogeneity_status enum [<prod tokens>]`, `mixing_relevant boolean`, `mixing_dimension enum visible_when "mixing_relevant == true"`, `vertical_mixing_distance number visible_when "mixing_dimension == '<vertical>'"`, `depth_below_surface_cm number`, `height_above_bed_cm number`, `depth_ok derived expr "if(depth_below_surface_cm >= 30 AND height_above_bed_cm >= 30, 1, 0)"` (30 cm printed l.1285/1311).
`heterogeneity_samples` (-03, **create**) → `sample_no number`, `flow number`, `determinand text`, `value number`; `travel_time_runs` (-04, **create**) → `flow number required`, `method text`, `travel_time_min number required`; `increments` (-09, **create**) → `time text`, `mode text`, `bottle text`, `preservative boolean`, `duration_min number`; `report_items_6` (-11, **create** json) → `select_many` `enum_values` = S13_1 items (replaces the single-value `report_item` enum — `iso5667_6-D-1`).
`bed_roughness_hint` (-13, **create** enum = ANNEXA keys) → `select_one`; `c_hint` (-13, **create** number) → `lookup_fill` `{ ANNEXA, role value, keys [{ column 'roughness', from_symbol 'bed_roughness_hint' }], value 'c_example' }` — `anhaltswert`, the engineer's `c` stays the input (SR-2, range 15–50 in `verification_quote`); `g` (typed input) → equation constant proposal `iso5667_6-D-2` (9,81 is not printed as a number in the transcript? — check; if only "aceleración de la gravedad" is printed, the constant is an owner ruling).

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| `travel_time_method`, `travel_time_flows_count`, `extrapolation_pct` (-04) | `travel_time_required == true` | §5.1.3 |
| `cycle_coincidence_avoided` (-05) | `sampling_strategy == '<systematic>'` | §5.2 |
| `inlet_velocity`, `isokinetic_conditions` (-08) | `sampling_method == '<continuous>'` | §8.2 (CR-017 guard STAGED `iso5667_6-G-1`) |
| `automatic_sampler_mode` | `sampling_method == '<continuous>'` | §8.2 |
| `increment_total_time`, `increments` (-09) | `sampling_mode == '<incremental>'` | §10.8 |
| `equipment_washes` = 0 rule | STAGED on `bottle_contains_preservative` (`iso5667_6-G-2`) | §10.3 |
| Annex A worksheet (-13) sections | `mixing_relevant == true` | §5.1.2 |
| `chain_of_custody_*` (-10) | `legal_purpose_sample == true` | §11.3.2 |

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `ISO-5667-6-02-D1` | -02 | `sampling_point_count_calc = count_rows(sampling_points_6)`; `points_depth_fail = count_rows(sampling_points_6, depth_ok == 0)` | register | §7 (CR-016) |
| `…-03-D1` | -03 | `heterogeneity_samples_count_calc = count_rows(heterogeneity_samples)`; `heterogeneity_flows_count = count_rows(heterogeneity_samples, …)` — distinct-flow count is not expressible (no `distinct`) → `iso5667_6-F-1`; `heterogeneity_spread = max_rows(heterogeneity_samples, value) - min_rows(heterogeneity_samples, value)` | register | §5.1.4 |
| `…-04-D1` | -04 | `travel_time_flows_count_calc = count_rows(travel_time_runs)` | register | §5.1.3 (CR-009 onto it STAGED `iso5667_6-G-3`) |
| `…-09-D1` | -09 | `increment_total_time_calc = sum_rows(increments, duration_min)` | register | §10.8 (CR-021) |
| `…-13-D1` | -13 | `l_mixing_calc = <Annex A formula as printed>` — ONLY after `iso5667_6-U-1` (√g vs 2g) is settled by the PDF; until then no new equation, the existing Eq. A.1 stays and the report names the ambiguity | — | Annex A |

- [ ] **Step 6: Emit + tests** (`iso5667_6`, `20260917102300` / `…10` / `…20`). Render test: `sampling_points_6` two rows (bridge vs under_ice), discriminator columns, `depth_ok`.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `iso5667-6-verify`; §5 wins 1 ✓, 2 partially (distinct flows F-1), 3 deferred (U-1), 4 ✓, 5 Phase 6.

---

### Task 24: VSME — Comprehensive-module gating on `BasisForPreparation`, sites register driving B05/B06, missing roll-ups (energy, GHG intensity, materials, emissions by medium), XBRL line-item tables as registers, printed thresholds as conditions

**Inputs:** inventory `…/inventory/VSME.md`; **NO transcript** — sources are `VSME Standard.pdf` (no text extraction on disk), the XLSX template and the XBRL taxonomy; the only quotable text this task may use is the prod `verification_quote`/CR description text that already carries VSME paragraph wording ("Para 29: „The undertaking shall …“") — grade EV, cited as `prod verification_quote (Para NN)`; every value/list beyond that is a sign-off entry. harness `tests/harness/vsme-verify.integration.test.ts`, `seed-vsme.ts`, `_harness-env-vsme.ts`; prod: 40 worksheets, 144 fields, 10 equations, 31 requirements. Already on the mechanism: `pollutant_register` (Plan 2a T5 fallback config + three `AmountOfEmissionTo*` fallback equations, migration `20260916110000_vsme_b04_register_equations.sql`) — untouched; VSME gate repair SP-1 (merged e1e56f0) — cite in `vsme-X-1`.

**Estimated size:** tables 0 (no transcript) / registers 7 (`subsidiaries` B01.100, `sites` B01.200, `policies` B02.000, `materials` B07.300, `employees_by_country` B08.200, `energy_carriers` B03.100, `human_rights_incidents` C07.000 — each replacing a one-row "line items" worksheet; the XBRL line-item structure is the printed structure, the column names come from the existing prod symbols, so no value is invented) / select_one 0 (drivers exist: `BasisForPreparation`, `UndertakingsLegalForm`, `BasisForReporting`, `ReportContainsDisclosures…`) / lookup_fill 0 / field `visible_when` 8 / section `visible_when` on every top-level section of C01…C09 (9 worksheets) and B01.100 / equations 8 new (the roll-ups the CR text describes) + 1 staged (accident rate basis not in prod — `vsme-F-1`) / sign-off ≈ 8. Time saved (§5): Option-A reporters stop seeing/warning on 30+ irrelevant fields; sites single source; roll-ups; true registers; thresholds.

**Files:** `field-configs/vsme.ts` + prior, `equations/vsme.ts`, tests, `register-vsme-sites.test.tsx`, STAGED, report; migrations `20260917102410_field_configs_vsme.sql`, `20260917102420_equations_vsme.sql` (no seed file).

- [ ] **Step 1: Read.** Inventory; prior (every CR description with "Para" wording is the quote source; list them); the XLSX template's sheet structure for B01.200 / B07.300 / B08.200 column headers (structure only, cite sheet names).

- [ ] **Step 2: Tables** — none. `vsme-U-1` records: "no transcript; a text extraction of VSME Standard.pdf (owner-provided) unlocks B03/B06/B08 thresholds as tables".

- [ ] **Step 3: Registers**

`sites` (VSME-B01.200, **create** json — or re-key the existing one-row line-items fields: the existing symbols `CountryOfSite`, `GPSLocationOfSite`, `AddressOfSite`, `PostalCodeOfSite`, `CityOfSite` stay as scalars for the first site and the register supersedes them — `vsme-X-2`) → `register`:
```json
{ "title": "Sites (B1 para 24(d))", "subtitle": "one row per site — drives B5 biodiversity flags and B6 water-stress withdrawal", "add_label": "+ site",
  "columns": [
    { "key": "country", "label": "Country", "type": "enum", "options": ["<prod CountryOfSite enum tokens — 256, copied from prior>"], "required": true },
    { "key": "gps", "label": "GPS", "type": "text" },
    { "key": "address", "label": "Address", "type": "text", "required": true },
    { "key": "postal_code", "label": "Postal code", "type": "text" },
    { "key": "city", "label": "City", "type": "text" },
    { "key": "in_biodiversity_area", "label": "in biodiversity-sensitive area", "type": "boolean" },
    { "key": "near_biodiversity_area", "label": "near biodiversity-sensitive area", "type": "boolean" },
    { "key": "area_ha", "label": "Area", "type": "number", "unit": "ha", "visible_when": "in_biodiversity_area OR near_biodiversity_area" },
    { "key": "high_water_stress", "label": "high water-stress area", "type": "boolean" },
    { "key": "water_withdrawn_m3", "label": "Water withdrawn", "type": "number", "unit": "m³", "visible_when": "high_water_stress" }
  ] }
```
`subsidiaries` (B01.100) → `name text required`, `registered_address text`; `policies` (B02.000) → `issue enum [<prod SustainabilityIssue tokens>] required`, `description text`, `public boolean`, `target_set boolean`, `senior_accountable boolean`; `materials` (B07.300) → `name text required`, `weight_t number`, `volume_m3 number`; `employees_by_country` (B08.200) → `country enum`, `count number required`; `energy_carriers` (B03.100) → `carrier enum [electricity, self_generated, fuels]` (the three prod symbols), `mwh number required`; `human_rights_incidents` (C07.000) → `type enum [<prod tokens>]`, `specification text`, `actions text`.

- [ ] **Step 4: Conditionals**

| target | visible_when | cue (prod CR text) |
|---|---|---|
| top-level sections of C01…C09 | `BasisForPreparation == '<OptionB token>'` | "OPTION A: Basic Module (only); or OPTION B: Basic Module and Comprehensive Module." |
| B01.100 sections / `subsidiaries` | `BasisForReporting == '<Consolidated token>'` | B1 para 24(c) |
| `OtherUndertakingsLegalForm` | `UndertakingsLegalForm == '<Other token>'`; B02.100 cooperative fields `== '<Cooperative token>'` | B1 para 24(e) / B2 |
| `ListOfDisclosuresForWhichNoChangesAreReported…`, `LinkToPreviousReport…` | `ReportContainsDisclosuresFromThePreviousReportingPeriodThatRemainUnchanged == true` | B1 |
| `EmployeeTurnoverRate` (B08.300) | `NumberOfEmployees >= 50` (50 printed in Para 40 text) | "If the undertaking employs 50 or more employees …" (CR-B08-03 guard STAGED `vsme-G-1`) |
| `DescriptionOfHowCircularEconomyPrinciplesAreApplied` | `UndertakingAppliesCircularEconomyPrinciples == true` | Para 37 (CR-B07-01 re-home STAGED `vsme-G-2`) |
| `TypeOfContentCovered…`, `Specification…` (C06) | `UndertakingHasACodeOfConduct… == true` | C6 para 61 |
| `GenderDiversityRatioInGovernanceBody` (C09) | `governance_body_exists == true` (create boolean) | "If the undertaking has a governance body in place" |
| C03.300 transition plan | `high_climate_impact_sector == true` (create boolean; NACE-list derivation is a `vsme-F-2` — the sector list is not in prod) | C3 |

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause (prod quote) |
|---|---|---|---|---|
| `VSME-B03.000-D1` | B03.000 | `TotalEnergyConsumption_calc = sum_rows(energy_carriers, mwh)` | register | Para 29 |
| `VSME-B03.300-D1…D4` | B03.300 | `GHGIntensity_<scope>_calc = <GHG total symbol> / Turnover` ×4 | as named | Para 31 "dividing gross GHG emissions … by turnover" |
| `VSME-B07.400-D1` | B07.400 | `TotalMassOfMaterialUsed_calc = sum_rows(materials, weight_t)`; `TotalVolumeOfMaterialUsed_calc = sum_rows(materials, volume_m3)` | register | B7 |
| `VSME-B05.000-D1` | B05.000 | `sites_in_or_near_biodiversity = count_rows(sites, in_biodiversity_area OR near_biodiversity_area)`; `area_biodiversity_ha = sum_rows(sites, if(in_biodiversity_area OR near_biodiversity_area, area_ha, 0))` | register | B5 para 33 |
| `VSME-B06.000-D1` | B06.000 | `AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress_calc = sum_rows(sites, if(high_water_stress, water_withdrawn_m3, 0))` | register | B6 para 35 |
| `VSME-B08.200-D1` | B08.200 | `employees_by_country_sum = sum_rows(employees_by_country, count)`; consistency `employees_country_delta = NumberOfEmployees - employees_by_country_sum` | register | B8 |
| `VSME-B01.100-D1` | B01.100 | `subsidiaries_count = count_rows(subsidiaries)` | register | B1 |
| `VSME-B02.000-D1` | B02.000 | `policies_public_count = count_rows(policies, public == true)` | register | B2 |

`EmployeeTurnoverRate` and the accident rate: bases not in prod → `vsme-F-1` (no formula invented).

- [ ] **Step 6: Emit + tests** (`vsme`, `2026091710241{0}`, `…2420`). Render test: `sites` two rows, conditional columns.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `vsme-verify`; §5 wins 1 ✓, 2 ✓, 3 ✓ (except F-1), 4 ✓, 5 ✓ (guards STAGED).

---

### Task 25: DIN-14021 — `selected_claim_type` drives visibility and gating of the 18 type-specific blocks, claims register (one row per claim), derived aggregate booleans and verdict, `unqualified_claim` driver, 6.5.3 a)–g) and 5.3–5.10 checklists

**Inputs:** inventory `…/inventory/DIN-14021.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-14021\DIN-EN-ISO-14021.md` (bilingual); harness `tests/harness/din14021-verify.integration.test.ts`, `seed-din14021.ts`; prod: 6 worksheets (-02 empty), 47 fields, 3 equations, 50 requirements. Reasoning map `reasoning-maps/DIN-14021/tab-14021-master-per-type.md` gives the claim-type → clause mapping (structure only; the clause text is quoted from the transcript).

**Estimated size:** tables 2 catalogues (`S6_5_3` 7 items a)–g); `S5_3_5_10` general requirements as printed headings; `CLAIMMAP` 23 claim types → clause + which numeric block, from §7.2–§7.17 headings) / registers 1 (`claims`) + 2 checklists (`documentation_items`, `general_requirements_items` as `select_many`) / select_one 1 created (`unqualified_claim` boolean attestation per claim — as a register column) / lookup_fill 0 / field `visible_when` 9 (the -05 numeric fields by type) / section 0 / equations 5 new (per-row formulas for 7.6/7.8/7.10 + aggregates) + 18 staged gate guards / sign-off ≈ 6. Time saved (§5): claims stop triggering all 18 blocks; several claims per product; aggregates derived; 100 % rules true conditionals; checklists.

**Files:** `regulation-tables-seed-din14021.ts`, `field-configs/din14021.ts` + prior, `equations/din14021.ts`, tests, `register-din14021-claims.test.tsx`, STAGED, report; migrations `20260917102500` / `…10` / `…20`.

- [ ] **Step 1: Read.** Transcript §7.2–§7.17 headings + each "darf nur … wenn" sentence; l.1297–1320 (7.6.3 formula), l.1570/1590 (7.10.3), §7.8.4, §7.14.2/§7.15.2 (100 %), §7.17.2/3, §6.3 (12 Monate "gewöhnlich"), §6.4 precedence, §6.5.1, §6.5.3 a)–g), §5.3–5.10 headings, §5.6, §5.8, §7.7/7.8 Möbius.

- [ ] **Step 2: Tables** (`standard_code 'DIN-14021'`): `CLAIMMAP` keys `claim_type` (prod `selected_claim_type` tokens, D-1) values `clause` (string), `numeric_block` (enum none/recovered_energy/recycled_content/reduced_resource/renewable_material/renewable_energy/carbon), `condition_text` (string, the "darf nur … wenn" sentence) — `locked`; `S6_5_3` keys `item` (a…g) values `text` — `locked` ("Mindestangaben"); `S5_3_5_10` keys `clause` (5_3 … 5_10) values `heading`, `requirement_text` — `locked`.

- [ ] **Step 3: Registers**

`claims` (DIN-14021-01, **create**) → `register`:
```json
{ "title": "Umweltbezogene Anbietererklärungen (Aussagen)", "subtitle": "§7 — je Aussage eine Zeile; der Aussagetyp bestimmt die spezifischen Anforderungen", "add_label": "+ Aussage",
  "columns": [
    { "key": "claim_type", "label": "Aussagetyp", "type": "lookup_key", "required": true, "lookup": { "table_code": "CLAIMMAP" }, "discriminator": true },
    { "key": "numeric_block", "label": "(Block)", "type": "lookup_value", "lookup": { "table_code": "CLAIMMAP", "key_column": "claim_type", "value": "numeric_block" } },
    { "key": "condition_text", "label": "Bedingung (§7.x)", "type": "lookup_value", "lookup": { "table_code": "CLAIMMAP", "key_column": "claim_type", "value": "condition_text" } },
    { "key": "scope", "label": "Geltungsbereich", "type": "enum", "options": ["<prod claim_scope tokens>"] },
    { "key": "channel", "label": "Kommunikationsweg", "type": "enum", "options": ["<prod communication_channel tokens>"] },
    { "key": "symbol_used", "label": "Symbol", "type": "boolean" },
    { "key": "mobius", "label": "Möbius-Schleife", "type": "boolean", "visible_when": "claim_type IN {recyclable, recycled_content}" },
    { "key": "explanatory", "label": "erläuternde Aussage", "type": "text" },
    { "key": "unqualified", "label": "uneingeschränkte Aussage", "type": "boolean", "visible_when": "claim_type IN {renewable_material, renewable_energy, carbon_neutral}" },
    { "key": "comparative", "label": "vergleichend", "type": "boolean" },
    { "key": "comparison_basis", "label": "Vergleichsbasis", "type": "enum", "options": ["<prod comparison_basis tokens>"], "visible_when": "comparative" },
    { "key": "comparison_months", "label": "Zeitraum (Monate)", "type": "number", "visible_when": "comparative" },
    { "key": "r", "label": "R", "type": "number", "visible_when": "numeric_block == 'recovered_energy'" },
    { "key": "e", "label": "E", "type": "number", "visible_when": "numeric_block == 'recovered_energy'" },
    { "key": "p", "label": "P", "type": "number", "visible_when": "numeric_block == 'recovered_energy'" },
    { "key": "net_recovered_pct", "label": "Anteil rückgewonnener Energie", "type": "derived", "expr": "(r - e) / ((r - e) + p) * 100" },
    { "key": "a_mass", "label": "A", "type": "number", "visible_when": "numeric_block == 'recycled_content'" },
    { "key": "p_mass", "label": "P", "type": "number", "visible_when": "numeric_block == 'recycled_content'" },
    { "key": "recycled_pct", "label": "X (%)", "type": "derived", "expr": "a_mass / p_mass * 100" },
    { "key": "i_res", "label": "I", "type": "number", "visible_when": "numeric_block == 'reduced_resource'" },
    { "key": "n_res", "label": "N", "type": "number", "visible_when": "numeric_block == 'reduced_resource'" },
    { "key": "reduced_pct", "label": "U (%)", "type": "derived", "expr": "(i_res - n_res) / i_res * 100" },
    { "key": "renewable_pct", "label": "Anteil erneuerbar (%)", "type": "number", "visible_when": "numeric_block IN {renewable_material, renewable_energy}" },
    { "key": "carbon_footprint", "label": "CO2-Fußabdruck (ISO/TS 14067)", "type": "number", "visible_when": "numeric_block == 'carbon'" },
    { "key": "type_ok", "label": "Typbedingung erfüllt", "type": "derived", "expr": "if(numeric_block == 'recovered_energy', if(r - e > 0, 1, 0), if(numeric_block IN {renewable_material, renewable_energy}, if(unqualified, if(renewable_pct == 100, 1, 0), 1), 1))" }
  ] }
```
(the formulas are the printed ones l.1302 / §7.8.4 / l.1570 — lifted into the config quote; `100` in 7.14.2/7.15.2 is printed; the remaining type conditions are attestations in `condition_text`, evaluated by the engineer — `din14021-J-1`.)
`documentation_items` (-04, **create** json) → `select_many` `enum_values` = S6_5_3 items; `general_requirements_items` (-03, **create** json) → `select_many` `enum_values` = S5_3_5_10 headings.
`unqualified_claim` (-05, **create** boolean) → `attestation` (scalar mirror for the single-claim worksheets); `-05` numeric fields `visible_when` by `selected_claim_type` per CLAIMMAP block (nine entries).

- [ ] **Step 4: Conditionals** — as in the register plus: `comparison_basis`, `comparison_same_functional_unit`, `comparison_time_interval`, `product_packaging_separated` (-04) `visible_when "comparative_claim == true"`; `mobius_loop_used` `visible_when "selected_claim_type IN {recyclable, recycled_content}"`; `symbol_distinguishable`, `natural_object_link` `visible_when "symbol_used == true"`; `explanatory_statement` stays. STAGED: the 18 `selected_claim_type IS NOT NULL` gates → `IF selected_claim_type == '<type>' THEN …` each with its §7.x quote (`din14021-G-1…18`, one block per requirement); REQ-14/15/46 guarded by `comparative_claim` (`-G-19`); REQ-26 `cond=TRUE` (`-G-20`); `comparison_time_interval` "eq 12" → default with justification (`din14021-G-21`).

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `DIN-14021-01-D1` | -01 | `claims_count = count_rows(claims)`; `claims_type_fail = count_rows(claims, type_ok == 0)` | register | §7 |
| `DIN-14021-06-D1` | -06 | `specific_requirements_met_code = if(claims_type_fail == 0, 1, 0)` | as named | "Aggregat" (manual → `din14021-D-1`) |
| `DIN-14021-06-D2` | -06 | `general_requirements_met_code` — from `general_requirements_items` (`select_many`) → needs `contains()` per item in an equation: `if(contains(general_requirements_items, '5_3') AND … , 1, 0)` — `contains()` is a logic function usable inside `if()` (Plan 2a T2) → encodable | `general_requirements_items` | §5.3–5.10 |
| `DIN-14021-06-D3` | -06 | `verification_requirements_met_code = if(contains(documentation_items, 'a') AND … AND contains(documentation_items, 'g') AND verifiable_without_confidential, 1, 0)` | as named | §6.5.1/§6.5.3 |
| `DIN-14021-06-D4` | -06 | `compliance_verdict_code = if(general_requirements_met_code == 1 AND specific_requirements_met_code == 1 AND verification_requirements_met_code == 1, 1, 0)` | as named | §5/6/7 |

- [ ] **Step 6: Emit + tests** (`din14021`, `20260917102500` / `…10` / `…20`). Render test: `claims` two rows (recycled_content vs recovered_energy), block columns, derived percentages.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `din14021-verify`; §5 wins 1 ✓ (guards STAGED), 2 ✓, 3 ✓, 4 ✓, 5 ✓.

---
### Task 26: ISO-14046 — elementary-flow register (unit process × flow with the seven §5.3.2 attributes), impact-category register with EQ-01 per row, `study_type` gates the impact assessment, Annex A fields by `is_organization_assessment`, a)–j) and 6.2 a)–g) checklists

**Inputs:** inventory `…/inventory/ISO-14046.md`; transcript `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\ISO-14046\ISO-14046.md` (**Spanish IDT — VC; the prod enum labels are English from another copy → `iso14046-E-1` records that labels are not verifiable from this transcript**); harness `tests/harness/iso14046-verify.integration.test.ts`, `seed-iso14046.ts`; prod: 7 worksheets, 73 fields, 1 equation, 22 requirements.

**Estimated size:** tables 2 catalogues (`S5_2_2_DQ` data-quality items a)–j); `S6_2_TP` third-party report items a)–g)) / registers 6 (`elementary_flows`, `impact_categories`, `lci_cf_rows`, `significant_issues`, `review_panel`, `sites_14046` (organisation, Phase-6 pointer only — NOT created here: `iso14046-X-1`)) / select_one 0 / lookup_fill 0 / field `visible_when` 9 / section `visible_when` on -04 (impact assessment) / equations 5 new + 1 staged (EQ-01 onto rows) / sign-off ≈ 6. Time saved (§5): inventory as rows retiring six re-typed scope fields (Phase 6 `iso14046-X-2`); profile derived; inventory studies not blocked; site inheritance (Phase 6); checklists.

**Files:** `regulation-tables-seed-iso14046.ts`, `field-configs/iso14046.ts` + prior, `equations/iso14046.ts`, tests, `register-iso14046-flows.test.tsx`, STAGED, report; migrations `20260917102600` / `…10` / `…20`.

- [ ] **Step 1: Read.** Transcript §5.1 (study type, comprehensive/qualifier), §5.2.2 a)–j) + n), §5.3.2 a)–g) and "for each unit process", §5.3.3, §5.4.7, §6.2 a)–g), §6.3.2, §7.1, §7.4 ("panel of at least three members"), Annex A (control/equity share). Quote in Spanish with the clause.

- [ ] **Step 2: Tables** (`standard_code 'ISO-14046'`): `S5_2_2_DQ` keys `item` (a…j) value `text` — `locked` ("should address" → `anhaltswert`? modal "should" → `anhaltswert`; record); `S6_2_TP` keys `item` (a…g) value `text` — `locked`.

- [ ] **Step 3: Registers**

`elementary_flows` (ISO-14046-03, **create**) → `register`:
```json
{ "title": "Elementary water flows", "subtitle": "§5.3.2 — one row per unit process × flow with attributes a)–g)", "add_label": "+ flow",
  "columns": [
    { "key": "unit_process", "label": "Unit process", "type": "text", "required": true },
    { "key": "direction", "label": "Input / output", "type": "enum", "options": ["input", "output"], "required": true, "discriminator": true },
    { "key": "quantity_m3", "label": "Quantity", "type": "number", "unit": "m³", "required": true, "min": 0 },
    { "key": "resource_type", "label": "Water resource type", "type": "enum", "options": ["<prod flow_water_resource_type tokens>"], "required": true },
    { "key": "quality", "label": "Quality parameters", "type": "text" },
    { "key": "form_of_use", "label": "Form of use", "type": "enum", "options": ["<prod flow_form_of_use tokens>"] },
    { "key": "location", "label": "Geographic location", "type": "text" },
    { "key": "temporal", "label": "Temporal aspects", "type": "text" },
    { "key": "releases", "label": "Releases to environment", "type": "text", "visible_when": "direction == 'output'" }
  ] }
```
`impact_categories` (-04, **create**) → `category text required`, `indicator_name text`, `model text`, `result derived` — per-category result = Σ over its LCI rows: G-10 (no nested register) → `lci_cf_rows` (-04, **create**) with `category text required` (matches the category label), `lci_result number required`, `cf number required`, `contribution derived expr "lci_result * cf"`; the per-category sum is `sum_rows(lci_cf_rows, if(category == '<name>', contribution, 0))` — category names are engineer text → cannot be enumerated in equations → `impact_categories` gets a `result number` the engineer copies? NO (derived must not be hand-enterable) → `iso14046-F-1`: per-category sums need a grouped aggregate (`sum_rows(reg, expr, group_by)`); until then ONE equation `category_indicator_total = sum_rows(lci_cf_rows, contribution)` and per-category via a fixed `category enum` column with the prod `impact_categories` enum tokens if that field is an enum in prior (then `sum_rows(lci_cf_rows, if(category == '<token>', contribution, 0))` per token is emitted).
`significant_issues` (-05, **create**) → `issue text required`, `contribution_pct number`, `mechanism text`; `review_panel` (-07, **create**) → `name text required`, `affiliation text`, `independent boolean`, `chair boolean`; `data_quality_items` (-02, **create** json) → `select_many` `enum_values` = S5_2_2_DQ; `third_party_report_items` (-06, **create** json) → `select_many` = S6_2_TP.

- [ ] **Step 4: Conditionals**

| target | visible_when | cue |
|---|---|---|
| top-level sections of -04 | `study_type == '<water_footprint_assessment token>'` | §5.1 (REQ-12 guard STAGED `iso14046-G-1`) |
| `water_footprint_qualifier` | `comprehensive_assessment == false` | §5.1/§5.4.7 |
| `organization_boundary`, `consolidation_method` | `is_organization_assessment == true` | Annex A (REQ-22 `iso14046-G-2`) |
| `third_party_report`, `third_party_report_items` | `report_type == '<third_party>'` | §6.2 |
| `critical_review_performed`, `review_panel`, `comparative_study_equivalence` | `comparative_assertion_public == true` | §7.1/§6.3.2 |
| `review_panel_members` | `critical_review_type == '<panel_review>'` | §7.4 |
| `allocation_balance_preserved`, `allocation_sensitivity_done`, `recycling_allocation_type` | `allocation_procedure != '<avoided token>'` | §5.3.3 |
| `weighting_report_note` | `weighting_applied == true` | §5.4.7 |
| `reference_period_inventory` | `baseline_conditions_present == true` (create boolean) | §5.2.2 n) |

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `ISO-14046-03-D1` | -03 | `water_input_total = sum_rows(elementary_flows, if(direction == 'input', quantity_m3, 0))`; `water_output_total = …'output'…`; per resource type `water_input_<type> = sum_rows(elementary_flows, if(direction == 'input' AND resource_type == '<token>', quantity_m3, 0))` (tokens from prior) | register | §5.3.2 |
| `…-04-D1` | -04 | `category_indicator_total = sum_rows(lci_cf_rows, contribution)` (+ per enum token when applicable) | register | EQ-01 (onto rows `iso14046-R-1`) |
| `…-07-D1` | -07 | `review_panel_members_calc = count_rows(review_panel)`; `panel_chair_independent = count_rows(review_panel, chair == true AND independent == true)` | register | §7.4 ("at least three" gate STAGED `iso14046-G-3`) |
| `…-02-D1` | -02 | `data_quality_complete_code = if(contains(data_quality_items, 'a') AND … 'j', 1, 0)` | as named | §5.2.2 |
| `…-06-D1` | -06 | `third_party_report_complete_code = if(contains(third_party_report_items, 'a') AND … 'g', 1, 0)` | as named | §6.2 |

- [ ] **Step 6: Emit + tests** (`iso14046`, `20260917102600` / `…10` / `…20`). Render test: `elementary_flows` two rows (input/output), `releases` only for output.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `iso14046-verify`; §5 wins 1 ✓, 2 partially (F-1 grouped sum), 3 ✓, 4 Phase 6, 5 ✓.

---

### Task 27: ATV-A-704E — determination rows (single results → mean/deviation), dilution/spiking/equivalency/parallel rows with the IGC formulas, QA-measure and Prüfmittel registers (values NOT seeded — no transcript), deviation log

**Inputs:** inventory `…/inventory/ATV-A-704E.md`; **NO transcript** (scanned PDF without text layer; `_encode_report.md` and prod VR/CR text are second-hand — grade EV; quotable only as `prod description (EV, unverified)`); harness `tests/harness/a704e-verify.integration.test.ts`, `seed-a704e.ts`; prod: 12 worksheets, 91 fields (23 `attest_*`), 6 equations, 30 requirements.

**Estimated size:** tables 0 (every IGC-Card value → sign-off `atv_a704e-U-1…6`, one per table the inventory names: IGC-Card 2 Sheet 1, Card 9 intervals, Card 9 Sheet 3 pipette ranges, §2.2 reference methods, Card 8 preservation, §4.2 20–80 % window; each entry proposes the table schema and asks for a PDF-page quote (VA path via `pdftotext -layout` is impossible on a scan → OCR by the owner or manual transcription)) / registers 7 (`einzelbestimmungen`, `verduennungsversuche`, `aufstockungsversuche`, `vergleichsmessungen`, `qs_massnahmen`, `pruefmittel`, `mitarbeiter`, `abweichungen`, `betriebsmethoden`) / select_one 0 (drivers exist) / lookup_fill 0 / field `visible_when` 6 / section 0 / equations 6 new (row versions of EQ-01…06) + 6 staged (the scalar EQ rows whose outputs are editable inputs) / sign-off ≈ 10. Time saved (§5): rows for all nine measures / all instruments / all determinations; formulas computed per row; the 23 `attest_*` booleans stay (evidence rows added, deactivation Phase 6 `atv_a704e-X-1`).

**Files:** `field-configs/atv_a704e.ts` + prior, `equations/atv_a704e.ts`, tests, `register-a704e-bestimmungen.test.tsx`, STAGED, report; migrations `20260917102710_field_configs_atv_a704e.sql`, `20260917102720_equations_atv_a704e.sql`.

- [ ] **Step 1: Read.** Inventory; prior (the formulas in EQ-01…06 as stored — the executor re-types them ONLY as row versions with the same math; `verification_quote` = `null` + sign-off, because no transcript can attest them); `_encode_report.md` for the IGC-Card structure (structure only).

- [ ] **Step 3: Registers**

`einzelbestimmungen` (ATV-A-704E-09, **create**) → `register`:
```json
{ "title": "Mehrfachbestimmung (IGC-Karte 3)", "subtitle": "je Einzelbestimmung eine Zeile — Mittelwert und Abweichung je Zeile berechnet", "add_label": "+ Einzelwert",
  "columns": [
    { "key": "parameter", "label": "Parameter", "type": "enum", "options": ["<prod parameter_name tokens>"], "required": true, "discriminator": true },
    { "key": "date", "label": "Datum", "type": "date", "required": true },
    { "key": "single_result", "label": "Einzelergebnis", "type": "number", "required": true },
    { "key": "unit", "label": "Einheit", "type": "text" }
  ] }
```
(the per-row deviation from the mean needs the mean → worksheet equation `mean_value_calc` then a second register pass is not possible → the deviation is a worksheet-level `max_abs_dev_pct` computed as `(max_rows − mean)/mean` and `(mean − min_rows)/mean` — see equations; per-row deviation column → `atv_a704e-F-1` (row expr cannot reference an aggregate of its own register).)
`verduennungsversuche` (-09, **create**) → `parameter enum`, `date date`, `sample_volume number required`, `total_volume number required`, `measured_diluted number required`, `calculated derived expr "total_volume / sample_volume * measured_diluted"` (EQ-03 math as stored — EV), `reference number`, `dev_pct derived expr "(calculated - reference) / reference * 100"`.
`aufstockungsversuche` (-09, **create**) → `parameter enum`, `date date`, `volume_sample number`, `volume_standard number`, `concentration_standard number`, `measured_original number`, `measured_spiked number`, `nss derived expr "(volume_sample * measured_original + volume_standard * concentration_standard) / (volume_sample + volume_standard)"` (EQ-04 as stored — EV), `dev_pct derived expr "(measured_spiked - nss) / nss * 100"`.
`vergleichsmessungen` (-10, **create**) → `kind enum [equivalency, parallel] discriminator`, `parameter enum`, `date date`, `operating_value number required`, `reference_value number required`, `nominal_value number visible_when "kind == 'equivalency'"`, `dev_pct derived expr "(operating_value - reference_value) / reference_value * 100"` (EQ-05/06 as stored — EV).
`qs_massnahmen` (-08, **create**) → `measure enum [<prod qa_measure tokens>] required discriminator`, `frequency text`, `target_pct number`, `performed_count number` — the frequency/target values are engineer-entered until `atv_a704e-U-1` supplies the table; `pruefmittel` (-11, **create**) → `equipment enum [<prod testing_equipment tokens>] required discriminator`, `interval enum [<prod monitoring_interval tokens>]`, `last_check date`, `result text`, `pipette_volume_ml number visible_when "equipment == '<pipette token>'"`, `pipette_dev_pct number visible_when "equipment == '<pipette>'"`, `heating_dev_c number visible_when "equipment == '<thermoblock>'"`, `photometer_check boolean visible_when "equipment == '<photometer>'"`; `mitarbeiter` (-12, **create**) → `name text required`, `qualification text`, `instruction_date date`, `training_record text`; `abweichungen` (-12, **create**) → `date date`, `feature text required`, `cause text`, `measure text`, `iqc_card_ref enum [<prod tokens>]`, `result text`; `betriebsmethoden` (-01, **create**) → `parameter enum required discriminator`, `application_mode enum [<prod tokens>]`, `expected_range text`, `validation_coverage_pct number`, `suitable boolean`.

- [ ] **Step 4: Conditionals** — `parallel_analysis_performed` block (-10) `visible_when "application_mode == '<parallel_to_reference>'"`; `precipitation_influence`, `storage_temperature` (-06) `visible_when "sampling_method == '<automatic>'"`; `heating_device_deviation` (-11) `visible_when "testing_equipment == '<thermoblock>'"` (CR-026 guard STAGED `atv_a704e-G-1`); `photometer_check_done` `visible_when "testing_equipment == '<photometer>'"`; -09/-10 sections `visible_when "multiple_determination_performed == true"` etc. (§4.4).

- [ ] **Step 5: Derived** (all `verification_quote: null` → each an `atv_a704e-U-*` entry; math = the stored EQ rows re-expressed over rows — no new math):

| equation_number | ws | formula | inputs |
|---|---|---|---|
| `ATV-A-704E-09-D1` | -09 | `n_determinations_calc = count_rows(einzelbestimmungen)`; `mean_value_calc = mean_rows(einzelbestimmungen, single_result)`; `max_dev_pct_calc = max(max_rows(einzelbestimmungen, single_result) - mean_value_calc, mean_value_calc - min_rows(einzelbestimmungen, single_result)) * 100 / mean_value_calc` | register |
| `…-09-D2` | -09 | `dilution_max_dev = max_rows(verduennungsversuche, abs(dev_pct))`; `spike_max_dev = max_rows(aufstockungsversuche, abs(dev_pct))` | registers |
| `…-10-D1` | -10 | `equivalency_max_dev = max_rows(vergleichsmessungen, if(kind == 'equivalency', abs(dev_pct), 0))`; `parallel_max_dev = …'parallel'…` | register |
| `…-08-D1` | -08 | `qa_measures_count = count_rows(qs_massnahmen)` | register |
| `…-11-D1` | -11 | `pruefmittel_count = count_rows(pruefmittel)`; `pipette_dev_max = max_rows(pruefmittel, if(equipment == '<pipette>', pipette_dev_pct, 0))` | register |
| `…-12-D1` | -12 | `abweichungen_count = count_rows(abweichungen)`; `mitarbeiter_count = count_rows(mitarbeiter)` | registers |

STAGED: EQ-01…06 outputs are editable inputs (`atv_a704e-R-1`: make them derived once the row versions are ratified); `sample_volume` vs `volume_sample` (`atv_a704e-X-2`); CR-019/020/021/022/023 onto the max-dev equations (`atv_a704e-G-2`).

- [ ] **Step 6: Emit + tests** (`atv_a704e`, `…2710`, `…2720`). Render test: `einzelbestimmungen` two rows, `mean_value_calc` through `evaluateFormula`.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `a704e-verify`; §5 wins 1 partially (register; values U-1), 2 partially, 3 ✓ (F-1), 4 ✓, 5 Phase 6.

---

### Task 28: ISO-5667-1 — `confidence_level` → K (pending a PDF-page quote), historical results rows → x̄/n/s, sites rows with situation-specific checks, `flow_aspect` filters methods, `programme_type` switch

**Inputs:** inventory `…/inventory/ISO-5667-1.md`; **NO md/txt transcript** (`ISO-5667-1.pdf` = NTC-ISO 5667-1 1995, Spanish, text-readable — the doctrine's VA path: the executor MAY run `& "C:\Users\Ekowai\scoop\shims\pdftotext.exe" -layout "<pdf>" "<scratchpad>\iso5667-1.txt"` via PowerShell to obtain a text extraction IN-SESSION, saved in the scratchpad (not the repo), and quote from it with the PDF page number — that is a VA-grade quote (PDF-derived) for the K table; if the tool is unavailable → `iso5667_1-U-1`, no table); harness `tests/harness/iso5667-1-verify.integration.test.ts`, `seed-iso5667-1.ts`; prod: 8 worksheets, 51 fields, 3 equations, 27 requirements. Edition caveat (`iso5667_1-J-1`): the source is the 1980 edition; prod clause references may not match the current ISO 5667-1 — the sign-off asks whether to encode against the 1980 text at all.

**Estimated size:** tables 2 (`S16_4_K` 7 rows — only via the PDF extraction; `S21` flow-method catalogue 3 aspects × methods) / registers 4 (`sites_1`, `historical_results`, `determinands`, `flow_measurements`) / select_one 0 / lookup_fill 1 (`K` ← S16_4_K by `confidence_level`) / field `visible_when` 8 / section 0 / equations 4 new + 1 staged (`n` circularity) / sign-off ≈ 7. Time saved (§5): K looked up; x̄/n/s computed; sites rows; method subset; programme switch.

**Files:** `regulation-tables-seed-iso5667_1.ts` (only if the PDF extraction succeeds), `field-configs/iso5667_1.ts` + prior, `equations/iso5667_1.ts`, tests, `register-iso5667-1-results.test.tsx`, STAGED, report; migrations `20260917102800` / `…10` / `…20` (seed file only if seeded).

- [ ] **Step 1: Read.** Inventory; PDF pages 9–15 via the extraction (§15, §16.4 K table, §16.5 example, §17, §21.2–21.4); prior (`confidence_level` tokens 99…50; `water_situation_type` 16 tokens; `flow_aspect`; `programme_type`).

- [ ] **Step 2: Tables** (`standard_code 'ISO-5667-1'`): `S16_4_K` keys `confidence_level` (prod tokens) value `k` — `locked` (statistical constants); `verbatim_quote` = the extracted row + "PDF p.11" → status `md_verified`? No — VA-grade: record `verification_status = 'pdf_verified'` (a third token, documented in the report; the column is free text) — `iso5667_1-J-2` asks the owner to confirm the token. `S21` keys `aspect` (direction_velocity/velocity/discharge), `method` (tokens per printed item) value `text` — `anhaltswert`.

- [ ] **Step 3: Registers**

`historical_results` (ISO-5667-1-07, **create**) → `register` columns `date date`, `x_i number required`; `sites_1` (-05, **create**) → `id text required`, `water_situation_type enum [<prod 16 tokens>] required discriminator`, `location_identified boolean`, `sampling_depth number visible_when "water_situation_type == '<groundwater>'"`, `groundwater_purged boolean visible_when "water_situation_type == '<groundwater>'"`, `sludge_pipe_diameter number visible_when "water_situation_type == '<wastewater_sludge>'"`, `cooling_system_type enum visible_when "water_situation_type == '<cooling_system>'"`, `flow_proportional boolean visible_when "water_situation_type == '<stormwater>'"`, `manhole_no_entry boolean visible_when "water_situation_type == '<sewer>'"`, `upstream_downstream enum`, `flow_character enum`, `weather text`; `determinands` (-02, **create**) → `parameter text required`, `variability_profile enum [<prod tokens>]`, `objective text`, `target_statistic enum`, `n_required number`; `flow_measurements` (-08, **create**) → `site text`, `flow_aspect enum [<prod tokens>] discriminator`, `method lookup_key S21` (group_by `aspect` — but `lookup_key` cannot be filtered by another column's value → `method enum` with all tokens + `method_ok derived expr "lookup('S21', flow_aspect, method, 'text') IS NOT NULL"`? `IS NOT NULL` on a lookup result inside a derived expr — lenient path; simpler: `S21` rows keyed (aspect, method) and `method_ok derived expr "if(lookup('S21', flow_aspect, method, 'valid') == 1, 1, 0)"` with a `valid` number column (1) — a missing row throws in strict mode → the executor tests behaviour and records `iso5667_1-F-1`), `mode text`, `velocity number`, `discharge number`.
`K` (existing number) → `lookup_fill` `{ S16_4_K, role value, keys [{ column 'confidence_level', from_symbol 'confidence_level' }], value 'k' }` — only if seeded.

- [ ] **Step 4: Conditionals** — `control_limits` (-06) `visible_when "programme_type == '<quality_control>'"`; `target_statistic` `visible_when "programme_type == '<quality_characterization>'"`; `sampling_time_note` `visible_when "variability_profile IN {<wide_rapid>, <cyclic>}"`; `pipe_nominal_bore`, `isokinetic_sampling` (-04) `visible_when "flow_character IN {<laminar_pipe>, <heterogeneous>}"` (CR-012/013 guards STAGED `iso5667_1-G-1`); `volatiles_minimal_suction` `visible_when "determinand_volatile == true"` (create boolean); `frequency_increase` `visible_when "abnormal_conditions == true"` (§17). STAGED: CR-016/017/019 guards by situation type (`iso5667_1-G-2`).

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `ISO-5667-1-07-D1` | -07 | `x_mean_calc = mean_rows(historical_results, x_i)`; `n_hist = count_rows(historical_results)`; `s_calc = stdev_rows(historical_results, x_i)` (sample, n−1 — matches Eq. 1 "/(n − 1)" as stored; quote from the PDF extraction if available) | register | §16.4 |
| `…-07-D2` | -07 | `n_required_calc = (2 * K * sigma / L) ^ 2` | as named | §16.5 (Eq. 3 exists on typed inputs → `iso5667_1-R-1`: `n` input vs `n_required_calc`) |
| `…-05-D1` | -05 | `sites_count = count_rows(sites_1)` | register | §8.1 |
| `…-02-D1` | -02 | `n_programme = max_rows(determinands, n_required)` | register | §15/§16 |

- [ ] **Step 6: Emit + tests** (`iso5667_1`, `20260917102800` / `…10` / `…20`). Render test: `sites_1` two rows (groundwater vs stormwater).
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `iso5667-1-verify`; §5 wins 1 conditional on the extraction, 2 ✓, 3 ✓, 4 partially (F-1), 5 ✓.

---

### Task 29: ISO-59004 — principles checklist with `all_principles_considered` derived, actions register (R-strategy → category via Table 1 once transcribed), goals register, glossary field dropped from data entry

**Inputs:** inventory `…/inventory/ISO-59004.md`; **NO transcript** (FDIS PDF `ISO_FDIS_59004_N.pdf`; the executor MAY extract text via `pdftotext.exe -layout` into the scratchpad as in Task 28 — FDIS status is itself a sign-off `iso59004-J-1`); harness `tests/harness/iso59004-verify.integration.test.ts`, `seed-iso59004.ts`; prod: 6 worksheets, 33 fields, 0 equations, 44 requirements (22 empty conditions).

**Estimated size:** tables 2 (`TABLE1` R-strategies 13 rows with category — ONLY from the extraction, else `iso59004-U-1`; `S5_2` six principles) / registers 3 (`actions`, `goals`, `indicators_59004`) + 2 checklists (`principles`, `circularity_aspects` as `select_many`) / select_one 0 / lookup_fill 1 (`action_category` per row ← TABLE1) / field `visible_when` 4 / section 0 / equations 3 new / sign-off ≈ 6. Time saved (§5): six-row principles checklist; actions register; ISO-59020 inheritance (Phase 6 `iso59004-X-1`); goals rows; glossary dropped (`iso59004-S-1` deactivation of `defined_term`).

**Files:** `regulation-tables-seed-iso59004.ts` (only if extracted), `field-configs/iso59004.ts` + prior, `equations/iso59004.ts`, tests, `register-iso59004-actions.test.tsx`, STAGED, report; migrations `20260917102900` / `…10` / `…20`.

- [ ] **Step 1: Read.** Inventory; prior (`selected_action` 13 tokens, `action_category` 5, `selected_principle` 6, `implementation_stage` 5, `implementation_level` 4, `feasibility_dimension` 6); the extraction (Table 1, §5.2, §6.1, §6.7, §7.1.3/7.1.4, §7.3.2) if produced.

- [ ] **Step 2: Tables** (`standard_code 'ISO-59004'`): `TABLE1` keys `action` (prod tokens) values `category` (string: prod `action_category` tokens), `description` — `anhaltswert` ("should"; "unless a life cycle perspective indicates a better outcome") — status `pdf_verified` if extracted (see Task 28 J-2); `S5_2` keys `principle` (prod tokens) value `text`.

- [ ] **Step 3: Registers**

`actions` (ISO-59004-05, **create**) → `register` columns `action enum [<prod selected_action tokens>] required discriminator` (`lookup_key TABLE1` once seeded), `category derived expr "lookup('TABLE1', action, 'category')"` (only with the table; else `category enum [<prod tokens>]` engineer-entered), `feasibility_dimensions text` (the six dimensions as a note; per-row multi-select is G-2/G-8 → text), `pilot boolean`, `life_cycle_note text visible_when "action IN {recycle, recover, re_mine}"` (the repair-before-remanufacture-before-recycle rule — tokens from prior), `value_creation_model text`; `goals` (-06, **create**) → `goal text required`, `intermediate_target text`, `year number`, `indicator text`; `indicators_59004` (-06, **create**) → `indicator text required` (links to ISO-59020 Table 3 by name — G-10), `baseline number`, `target number`.
`principles` (-04, **create** json) → `select_many` `enum_values` = the six principle tokens (prod `selected_principle` enum, D-1 — the labels stay prod's) with `ui_config { title: 'Grundsätze (§5.2)', note: '<CR-013 sentence, EV>' }`; `circularity_aspects` (-02, **create** json) → `select_many` `enum_values` = durability/recyclability/reusability/repairability/recoverability (from the prod description list — EV, `iso59004-U-2`).

- [ ] **Step 4: Conditionals** — `implementation_*` guidance fields `visible_when "implementation_stage == '<stage token>'"` per §7.2–7.6 (five entries); `level_relationships` `visible_when "implementation_level == '<multi token>'"`; `life_cycle_justification` `visible_when "repair_before_remanufacture_before_recycle == false"` (CR-028 guard STAGED `iso59004-G-1`); `defined_term` → deactivation proposal `iso59004-S-1`. STAGED: the 22 empty-condition CRs — propose conditions from the checklists/registers (`iso59004-G-2`).

- [ ] **Step 5: Derived**

| equation_number | ws | formula | inputs | clause |
|---|---|---|---|---|
| `ISO-59004-04-D1` | -04 | `all_principles_considered_code = if(contains(principles, '<p1>') AND … AND contains(principles, '<p6>'), 1, 0)` (six tokens from prior) | `principles` | CR-013 sentence (EV) — manual boolean → `iso59004-D-1` |
| `…-05-D1` | -05 | `actions_count = count_rows(actions)`; `refuse_rethink_first = count_rows(actions, action IN {refuse, rethink})` | register | §6.1 |
| `…-06-D1` | -06 | `goals_count = count_rows(goals)`; `goals_with_targets = count_rows(goals, intermediate_target != '')` | register | §7.3.2 |

- [ ] **Step 6: Emit + tests** (`iso59004`, `20260917102900` / `…10` / `…20`). Render test: `actions` two rows.
- [ ] **Step 7: Verify + sign-off + report + commit** — harness `iso59004-verify`; §5 wins 1 ✓, 2 ✓ (category from table only if extracted), 3 Phase 6, 4 ✓, 5 ✓ (deactivation STAGED).

---

### Task 30: Close-out — whole-branch verification, apply order, playbook token-cost ratio, sign-off consolidation, ledger

**Files:** modify `docs/superpowers/guideline-to-tool-playbook.md` (apply order + "What Plan 3 added" + the measured ratio), `docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md` (index at the top: count per class per standard), create `docs/superpowers/specs/2026-09-11-guideline-to-tool/reports/plan-3-LEDGER.md`.

- [ ] **Step 1: Whole-branch verification**

```bash
pnpm test && pnpm -s typecheck && pnpm -s lint
pnpm vitest run --project integration            # every harness chain the 29 tasks named
for s in a138 din1989_1 a262e m277e m1200_1 m1200_3 fll_gar fll_naturteich m820_3 din18130_1 m205 m187 din276 a178 din16941_2 m1200_2 din1989_2 m820_1 m820_2 iso5667_10 iso59020 iso46001 iso5667_6 din14021 iso14046; do pnpm -s tsx scripts/regulation-tables/emit-seed-sql.ts $s; done; git status --short   # regenerated files must not differ (emitters deterministic)
ls scripts/migrations/20260917*.sql | wc -l ; ls scripts/rollback-20260917*.sql | wc -l   # equal counts
git log --oneline 3a48ee3..HEAD
```
Paste raw output. R-1: the command, not the claim.

- [ ] **Step 2: Apply order** (playbook "Apply order" extended — owner-stamped, never run from a session): after Plan-1 schema `20260911100000`, Plan-1 seed `20260911110000`, Plan-1 configs `20260911120000_*`, Plan-2a `20260916100000/110000/120000`, Plan-2b migrations (as its close-out lists): for each standard in Task order 1→29, `<ts>00_regulation_tables_seed_<slug>.sql` → `<ts>10_field_configs_<slug>.sql` → `<ts>20_equations_<slug>.sql` (tables before the configs that bind them; configs before the equations that read the created registers). Standards are independent of each other (except Task 6 reading Task 5's class only by inheritance, which is data, not schema). Rollback = reverse order per standard, all after redeploying the pre-Plan-3 build only if a Plan-3 code change requires it (this plan changes no runtime code path; `widget = NULL` and missing rows are the fallback). Verification queries per standard: `select t.table_code, count(*) from regulation_table_rows r join regulation_tables t on t.id=r.table_id where t.standard_code='<CODE>' group by 1;` and `select widget, count(*) from fields f join worksheet_templates w on w.id=f.worksheet_template_id join standards s on s.id=w.standard_id where s.code='<CODE>' and widget is not null group by 1;` — expected counts copied from each task report.

- [ ] **Step 3: Token-cost ratio.** From the 29 reports: tokens in vs (tables + rows + registers + conditionals + equations) out; Task 1's line becomes the playbook's "Token budget note" number ("Measured on DWA-A-138-1 (Plan 3 Task 1): N tokens → T tables / R rows / G registers / C conditionals / E equations; per-standard median across the 29: …"). Also record which tasks stopped at unreadable cells (U-entries) and how many rows that cost.

- [ ] **Step 4: Sign-off consolidation.** Prepend an index table to `SIGN-OFF-plan-3.md`: standard × class (G gate-guards, R equation-replacements, D derived-from-manual, S structural, C consumer edits, M multi-select drivers, J judgments, U unreadable/unsourced, P override-policy, E enum mismatches, F interface gaps, X Phase-6 inheritance) with counts and the STAGED file path; list the interface gaps G-1…G-16 with the tasks they hit, as the Plan-2b/2c follow-up backlog (F-entries).

- [ ] **Step 5: Ledger.** `reports/plan-3-LEDGER.md`: model + CLI version + effort (session header rule), per-task commit hash, migration filenames, counts, apply-order pointer, the memory line to add (`project_guideline_to_tool_generic_fields.md`: "Plan 3 BUILT — 29 standards encoded on branch, N migrations written-not-applied, sign-off entries N; next = owner batch + Plan 2c (G-1…G-16)").

- [ ] **Step 6: Commit** — `docs(plan-3): close-out — apply order, token-cost ratio, sign-off index, ledger`.

---
## Per-standard subagent brief template (the controller fills the angle-bracket slots; paste Appendix A verbatim at the end)

```
You encode ONE standard of the EKOWAI Wizard onto the guideline-to-tool mechanism. You write code, configs,
tests and WRITTEN-NOT-APPLIED migrations on branch feat/guideline-to-tool in C:\Users\Ekowai\_wt-g2t. You do
NOT apply anything to any database, do NOT run vercel/drizzle-kit/apply-migration, do NOT use subagents, and do
NOT touch another standard's files. Commit once at the end as Alvaro (git config user.email = alvaro.burgos@ekowai.com)
with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

STANDARD:        <CODE>            slug: <slug>          Plan-3 task: <N> (docs/superpowers/plans/2026-09-16-guideline-to-tool-plan-3-encode-29-standards.md)
INVENTORY:       docs/superpowers/specs/2026-09-11-guideline-to-tool/inventory/<CODE>.md   (read completely first)
TRANSCRIPT(S):   <exact path(s) from the plan's transcript table>   grade: <md | txt | NONE>   language: <de|en|es>
PLAYBOOK:        docs/superpowers/guideline-to-tool-playbook.md (Steps 1–6; apply-order constraint)
CONTRACTS:       src/lib/eval/field-config.ts (zod), src/lib/eval/regulation-tables.ts, src/lib/eval/regulation-tables-seed-a138.ts (builder pattern),
                 src/lib/eval/field-configs/types.ts, scripts/regulation-tables/emit-*.ts, src/lib/expr/functions.ts (function set)
HARNESS:         <tests/harness/... files named in the task>
PRIOR CAPTURE:   node scripts/verification/prod-query.mjs --sql "<the two queries in Task 0>"  → src/lib/eval/field-configs/<slug>.prior.json (read-only; never print secrets)

DO, in this order (the task's Steps 1–7): read → tables (builder + pin + verifier run) → field configs (registers/selections/lookup_fill/visible_when)
→ equations → emit the three migrations + rollbacks → tests (pnpm test, pnpm -s typecheck, harness) → sign-off entries + STAGED file → report → commit.

RULES THAT OVERRIDE EVERYTHING ELSE (from the plan's Global Constraints — read them in full in the plan):
1. Never type a value that you have not, in this session, read in the transcript and quoted into verbatim_quote /
   verification_quote / override_quote with its line. The plan gives you column names and line ranges, never values.
2. A cell you cannot read → do not seed it; write a sign-off entry (<slug>-U-n) and continue.
3. D-1: never overwrite non-null prod enum_values ('keep_prod'); fixed printed options ⇒ select_one/select_many; single-source
   derivation; a bare pointer to another document is a `reference`, never an expanded list.
4. Additive only: new register carriers / select_one drivers / lookup_fill targets via `create`. Anything that changes an existing
   gate, equation, data_type, is_required, consumer_worksheets, or deactivates a field goes into
   scripts/verification/<slug>-STAGED-plan3-rulings.sql as commented SQL with ☐ RATIFIED, plus a SIGN-OFF entry. Never blocks you.
5. visible_when drivers must be select_one (or boolean); a select_many/free-text driver is a sign-off entry (<slug>-M-n).
6. Migrations are generated by the emitters, never hand-written; each has a rollback; nothing is applied.
7. One standard. Sequential. Report raw command output, not summaries.

REPORT (docs/superpowers/specs/2026-09-11-guideline-to-tool/reports/plan-3-<slug>.md): the counts table from reports/README.md;
raw `pnpm test` / typecheck / harness output; the verifier's PASS/FAIL list; inventory §5 wins 1–5 each marked encoded /
partially / deferred with the entry id; residue (every unreadable cell, every judgment); tokens in / minutes; commit hash.
Reply to the controller with: the report path, the counts line, the commit hash, and the list of sign-off entry ids.

<Appendix A — the doctrine — pasted VERBATIM here>
```

## Self-review (run by the plan author before execution)

**Spec coverage.** §4 nine shapes — every task assigns `select_one`/`select_many` (T2 `kanalart`, T15 multi-select carriers, T9/T19/T25 checklists), `lookup_fill` (T1 tier/η, T2 `e`, T3 Table 1, T7 twelve limit fields, T11 lamp properties, T18 thresholds), `register` (every task), `grid` (deliberately none — the only both-axes-closed matrices, DIN-276 stage×KG and M-1200-1 Tab. 23, are encoded as a stage-row register and as a two-key table lookup respectively, because the `grid` `ui_config` has no contract until Plan 2b; recorded as F-entries), `reference` (T17 EN 12056-3), `derived` (equations everywhere), `attestation` (T1/T12/T14/T15/T24 booleans), `scalar` (unchanged), `visible_when` (every task, fields + sections). §4 method patterns — readings/sample tables (T10, T16, T27, T11), rolling acceptance (T3 `last_rows`), method/variant switch (T7, T11, T12, T14, T17, T24, T25), status against use-dependent guide values (T15 D.1/D.2, T5 Tab. 8, T11), test-run sequence (T17 Tab. 2, T20 Formula 1/2), multi-party grid (T18 — stays on the bespoke risk editor, Plan 2b), decision path (T1 Tab. 3, T5 strictest class), catalogue with rating (T9, T21, T29 — via G-2 workaround), class chain (T1 Tab. 5→6/7, T5 Tab. 7→8, T3 Tables 3–16), per-flow rows (T21, T22, T26, T24), parallel systems with discriminator (T3 `filterstufen`, T16 `verfahrenskette`, T12 `teilfilterbecken`, T8 `filtereinheiten`, T2 `speicher_behaelter`). §7 procedure and override policies quoted in Global Constraints 4–5 and applied per table with a cue in every Step-2 table. §8 phase 5 order = Tasks 1–12 in §10 order; §12 out-of-scope honoured (no verified equation changed — replacements are STAGED; no cross-standard inheritance encoded — X-entries; no worksheet collapsed; no data-quality finding applied — G/R entries). §13 D-1 honoured (`keep_prod` everywhere prod enums exist), D-2/D-3 untouched.

**Inventory coverage.** For each of the 29 tasks the §1 tables, §2 groups, §3 conditionals and §4 derived rows of the inventory were walked; every §5 top win maps to an encoded item, a STAGED item or an X/F entry named in Step 7. Inventory data-quality gaps that are corrections (CR-004 class-D, CR-06 tokens, REQ-19 literal 7, ±25 %, "0,2 m mit Carbonatschicht", Gl. 13/14 identical, EQ range checks, √g) appear as G/R/U entries, never as edits.

**Placeholder scan.** Every task has: inputs with exact paths; an estimated-size line with counts and the §5 time-saved claim; Step-2 tables with `table_code`, `key_columns`, `value_columns`, policy + cue, transcript lines, status rule; Step-3 register JSON or column lists with types, lookups, discriminators, per-column `visible_when`; Step-4 `visible_when` strings; Step-5 formula strings with `input_symbols` and class; Step-6 emit commands with timestamps; Step-7 verification and commit. No "TBD", no "similar to task N" — the twelve M-820-3 registers and the sixty M-820-3 equations are generated from an explicit template with explicit parameters, not by reference. Angle-bracket slots (`<prod tokens>`, `<misch token>`) are deliberately unresolvable here: they are prod enum identifiers the executor copies from `prior.json` (D-1), never values; every numeric slot says "printed"/"lifted" with the line.

**Type consistency.** `FieldConfigEntry` (Task 0) carries every field the tasks use (`widget`, `ui_config`, `lookup`, `visible_when`, `enum_values | 'keep_prod'`, `verification_quote`, `create`); `SectionVisibilityEntry` keys on `(worksheet, section_code)` which the emitter joins on `worksheet_sections.code` (nullable → STAGED path stated); `EquationEntry` maps 1:1 onto the `equations` columns (`worksheet_template_id` resolved by code, `equation_number` unique per worksheet via `ON CONFLICT DO NOTHING`, `description` prefix as the rollback selector); register column JSON uses only the zod `registerColumn` keys plus `max` (added by Plan 2a T5 — the executor confirms it landed); `lookup_fill` bindings use `keys[].from_symbol` only (G-12 stated where a literal would have been needed); every formula uses only the Plan-2a function set; row-scope reads of worksheet symbols are marked G-13 with the fallback (worksheet equation) stated.

**Interface gaps surfaced (for the controller's report):** G-1 single-key `lookup_value` (multi-key per-row lookups → `derived` + `lookup()` without override): A-262E Tables 3–16, M-1200-3 Tab. 7/8/9, FLL-GAR Tab. 22/8, DIN-1989-1 Tab. 2, M-205 Tabelle 2, M-1200-1 Tab. 23 per row. G-2 no fixed-row catalogue register: M-820-3, ISO-59020 Table 3, ISO-59004, DIN-14021, M-820-2 outlines, DIN-1989-1 Tab. 5. G-3 no median/percentile: M-1200-2 P50, M-205 percentiles. G-4 sample stdev default: DIN-18130-1, M-1200-2, M-820-1. G-5 no date arithmetic/string aggregates: M-820-2 warranty dates, ISO-5667-10 grab windows. G-6 numeric-only equation outputs: A138 tier/BK, M-1200-1 class, DIN-18130-1 Bereich, FLL-GAR W/R classes, M-277E type — all via numeric codes + companion tables or `lookup_fill` strings. G-7 selection-config emitter insufficient → Task 0. G-8 `ui_config.flags` missing. G-9 `lookup_fill` on engine outputs unconfirmed. G-10 no register→register reference: M-1200-1, DIN-276, M-820-2, ISO-14046 (grouped sum), ISO-59004. G-11 no ceil/floor/round: A138 test-site density, A-262E cells. G-12 `lookup_fill.keys[].from_symbol` cannot be a literal (constant-keyed tables split per parameter): A-262E Table 1/2, M-277E Table 4, M-1200-1 Tab. 8, M-1200-3 Tab. 11/14, FLL-Naturteich Tables 7/8, DIN-EN-16941-2 D.1/D.2, M-820-1 VgV constants, DWA-A-178 constants. G-13 worksheet symbols inside register `derived` exprs — must be confirmed in `register-rows.ts` (`RegisterRowsCtx.symbol`): A-262E `EZ`, FLL-GAR `abdichtungs_art`, M-1200-3 `gueteklasse`, DIN-18130-1 `gefaelle_typ`, M-205 class symbols, ISO-5667-10 `A`/`number_of_samples`. G-14 `lookup()` column name is a literal, not selectable by `if()`: M-1200-3 Tab. 11/3/13 — workaround stated. G-15 boolean keys stringify to `"true"/"false"`: DIN-18130-1 Tab. 4, M-820-1 §134, DIN-EN-16941-2 Sprüh, ISO-59020 boolean `lookup_value`. G-16 no filtered `mean_rows/stdev_rows` (only `count_rows` takes a condition): M-1200-2 per-organism statistics — per-organism registers as the workaround.

## Appendix A — Verification doctrine (from `scripts/verification/MD-PASS-BRIEF.md` on `main`, section 1; paste VERBATIM into every subagent brief, never summarise)

# Verification Doctrine (BINDING — paste VERBATIM into every subagent brief, never summarize)

This is the canonical doctrine for all regulation-encoding, harness, and verification work in this
repo. It exists as a FILE so no session or subagent depends on chat memory. Author: Alvaro
(leadership@ekowai.com), codified 2026-07-24.

## Standing Rules

**SR-1 — Verbatim source before apply.** A numeric/data correction is NOT ready to apply unless its
target value is quoted **verbatim from the standard's own text or table, in the same session it is
applied**. Internal logs, prior conversations, bring-up "expected" values, and another engineer's
recollection are NEVER sources. A **proven computation is not a proven input** — a harness that shows
`IF C=x THEN out=y` proves the math, not that x is correct. If a standard defers to another (e.g.
FLL-GAR → DIN 1986-100), the referenced standard becomes the governing table: quote ITS row. If no
verbatim source reads the target value → STOP, surface the discrepancy, do not apply. The
**orchestrator** enforces this and rejects a source-less fix before it reaches the user.

**SR-2 — Range → never auto-pick.** Where the standard gives a range, the system never silently
selects a point value. It either uses an already-source-verified in-range value, or surfaces the
range to the engineer as an explicit selection field. The machine enforces what the standard SAYS;
where the standard leaves a choice, the choice is visible and human.

**SR-3 — Rendered PDF is ground truth.** Authority order is **PDF > markdown > encoding > ledger >
chat**. Every source verification reads the RENDERED PDF; markdown/JSON extractions are searchable
convenience only. **A VA (verified-authoritative) claim without a PDF-page reference is invalid.**
PDF-confirmed = VA; markdown-only = VC; a PDF-vs-markdown disagreement is itself a finding (PDF wins).

**SR-4 — Infra for a mandate is auto-approved.** Schema/infrastructure changes needed to fulfill an
APPROVED mandate are auto-approved: pick the option consistent with production reality + the mandate,
log the decision + rationale in the ledger, and proceed — never stop to ask for this class (e.g. when
a brief's premise doesn't match reality, take the reality-consistent path and continue). The ONLY
stop-conditions are: prod applies OUTSIDE an approved mandate, changes to ratified designs, and
irreversibles.

## Provenance grades
- **EV** — encoded/exists in the DB, unverified against source.
- **VC** — verified against a convenience extraction (markdown/JSON) only; PDF page not confirmed.
- **VA** — verified against the authoritative rendered PDF; **requires a PDF-page ref** + date + build.
- **NR** — not reachable: depends on a document not in the library; caps at NR/VC, visibly.

## data_class (every table/value/field node carries one)
- **standard_fixed** — printed in the guideline, immutable. **PDF-page ref REQUIRED.**
- **standard_range** — bounds fixed by the standard; the point selection is an explicit engineer
  choice (SR-2).
- **engineer_input** — project data the standard never states.
- **derived** — engine-computed only; a compute trace is required.

Equation nodes' `requires::` edges inherit the class of each input, so every calculation chain is
classifiable end-to-end from printed page to computed result. **Validator rules:** standard_fixed
without a PDF page ref = invalid; standard_fixed that is UI-editable = finding; derived that is
hand-enterable = finding (the #22 class); a value inside a standard_range with no selection record =
finding (the F-7 class). Classification happens at map-generation from the PDF + encoding; ambiguous
cases (normative binding table vs. exemplary Anhang worked example, modal verbs) go to Alvaro's
decision batch — never guessed.

## Process
- **Raw output for claims.** Every "it passes / it persists / it fires" claim is backed by pasted raw
  command output (vitest result, SQL read-back, git log), not a summary.
- **Sequential subagent-per-task with orchestrator verification.** One subagent per task; the
  orchestrator independently verifies each result (revert-verify / DB read-back / by-file tsc) BEFORE
  the next launches. All on the session model — no speed-downgrades. Wall-clock is not a metric.
- **Subagent briefs carry this doctrine VERBATIM**, never summarized.
- **Findings over fixes.** Catalogue everything; fix only what is unambiguous under the doctrine
  (PDF-attested). Anything needing a ruling or a range-selection is staged written-not-applied and
  batched to Alvaro per standard at milestone ends — never auto-decided, never skipped, never an
  interruption mid-run.
- **No prod hand-edits.** Data enters via the importer or a gated migration. Prod writes go through
  the Management-API POST path (read-only Supabase MCP for verify); secret VALUES are never printed.
- **Honest residue is a deliverable**, not a footnote — named per item with why.

## Source documents (recorded paths)
- **FLL PDFs:** `C:\Users\Ekowai\Desktop\FLL Guidelines PDF\` — GAR 2023
  (`fll_gewaesserabdichtungsrichtlinien_2023__2 (2).pdf`), TP-Rhizomfestigkeit 2023
  (`fll_tp_rhizomfestigkeit_gewaesserabdichtung_2023 (1).pdf`), Naturteich 2017
  (`guidelines_for_the_planning_construction_and_maintenance_of_private_natural_swimming_pools_2017_p (1).pdf`).
- **DWA-A-138-1 PDF:** `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).pdf`
  (markdown/xlsx siblings in the same folder).

## PDF reader pipeline (Ekowai-PC-01)
WSL `/mnt/c` is BLIND to `C:\Users\Ekowai\Desktop\FLL Guidelines PDF` — use Windows paths, not the
Bash tool. The Read tool's `pdftoppm` is rejected (scoop shim = "unsafe location"). Working path =
call scoop poppler directly via PowerShell:
`& "C:\Users\Ekowai\scoop\shims\pdftotext.exe" -layout "<pdf>" "<out.txt>"` then Select-String / read
the text. For a specific page range add `-f <first> -l <last>`.

## Prod
Prod = Supabase project `vadsmshzebefjreqcicl`. Read-only via Supabase MCP `execute_sql`. Writes via
the Management-API POST helper (`scripts/phase4/_mgmt-apply.mjs` pattern, `$SUPABASE_ACCESS_TOKEN`
from env, never printed). `audit_status` / `verification_status` untouched by fixes.

(End of doctrine.)

**Owner rulings that govern this pass (2026-09-05, Alvaro — from the same brief, section 0, verbatim):**
1. **Markdown is the verification source.** "each pdf has an md version so use that instead so we reduce
   the tokens and the md version is actually from each guideline" and "only when there is no markdown u can
   use the pdf". So: quote from the md file you are given. Grade every quote **[VC]** (SR-3 above still
   defines VA as PDF-confirmed; we are deliberately working at VC).
2. App-metadata fields (client name/address, project id/name, planning date, phase-gate roll-ups, overall
   verdict, workflow flags the guideline never defines) get `verification_status='inferred_from_worksheet'`
   (exempt class, ruled 2026-08-01 for A138) — never a fabricated quote.
3. Anything that changes structure, enforcement or required-ness (phantom-field deactivation, clause
   retags, `is_required` changes, gate re-homes, severity changes, enum edits) goes into a **STAGED file as
   commented SQL with a ☐ RATIFIED marker**, never into the pack.
