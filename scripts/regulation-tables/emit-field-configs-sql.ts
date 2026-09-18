/**
 * Plan 3 Task 0 — the field-config emitter: the Plan-2b widget emitter
 * (`emit-widget-configs-sql.ts`, whose `q`/`j`/`JOIN`/`sqlComment`/
 * `gatedHeaderLines` primitives and per-entry UPDATE scoping it reuses)
 * generalised to the DATA a Plan-3 standard task writes:
 *
 *   - one `UPDATE fields` per entry, scoped standard + worksheet + symbol
 *     (+ `f.active`, matching the capture filter), ALWAYS writing `widget`,
 *     `ui_config`, `lookup`, `visible_when`;
 *   - `enum_values` written only into a captured NULL prior (owner ruling D-1
 *     — a non-null prod list is never overwritten; the entry says
 *     `'keep_prod'` and files a sign-off entry when the printed list differs);
 *   - a `visible_when` on a symbol that another worksheet consumes
 *     (`consumer_worksheets` non-empty in the prior snapshot) is REFUSED
 *     (importer rule, Plan 2a Task 10 — hiding a producer would hide the
 *     value its consumers inherit); since Task 3 fix round 1 the guard is
 *     TRANSITIVE: a symbol that is an `input_symbols` member of a
 *     same-worksheet equation whose output — directly, or through further
 *     same-worksheet equations — is a consumed field is refused too (a hidden
 *     input nulls the equation, and the consumers inherit the null); the
 *     chain is walked over the captured `prior.equations` (plus the Plan-2a
 *     `rewriteRules[id].remap` inputs) and named in the message; a legacy
 *     prior without `equations` degrades to the direct rule (the CLI warns);
 *     the owner worksheet's own code is REMOVED from a field's
 *     `consumer_worksheets` before any of this is decided (Task 12b ruling)
 *     — the runtime never inherits a field from its own owner worksheet
 *     (`loadInheritedFields` in `src/lib/db/queries/worksheet.ts` filters
 *     `worksheetTemplateId <> currentTemplateId`), so a self-only entry is a
 *     runtime no-op and must not count as a consumer; the CLI prints a
 *     NOTICE for every symbol whose captured `consumer_worksheets` held such
 *     a self-entry (a prod data oddity worth recording even though it
 *     changes nothing here);
 *     the same refusal applies to a SECTION
 *     `visible_when` whose section — or any descendant section, coded or
 *     not, since the runtime hides descendants of a hidden section — contains
 *     such a producer (walked via the captured `section_path`);
 *   - `UPDATE worksheet_sections` per section entry, keyed by worksheet code +
 *     section code, refused when the key is absent from the captured
 *     `prior.sections` (its UPDATE would touch 0 rows); a section whose prod
 *     `code IS NULL` cannot be keyed — the task records it in its STAGED file;
 *   - `create` entries INSERT additively (`WHERE NOT EXISTS`), never touching
 *     an existing row; `create.section_code` must exist in `prior.sections`
 *     when that map was captured (else the row would land unsectioned); the
 *     `Plan 3:` description prefix is the rollback selector so the rollback
 *     deletes only what this migration created;
 *   - the rollback restores every touched field's four columns (and
 *     `enum_values` when written) to the captured prior, byte-for-byte; a
 *     row/section with no captured prior is restored to NULL with an explicit
 *     comment line saying so.
 *
 * Every entry is validated before a single statement is emitted: the prior
 * snapshot itself (`assertPriorSnapshot` — JSON columns must be object/array/
 * null, never a stringified or truncated cell), zod (`parseFieldConfig`),
 * condition/expr parse of `visible_when` and of every register column's
 * `expr` / `visible_when`, the D-1 and consumed-producer guards, the
 * `lookup_fill` data_type rule (amendment C), select widgets without options,
 * duplicate entries.
 *
 * The prior snapshot (`src/lib/eval/field-configs/<slug>.prior.json`) is a
 * READ-ONLY capture of prod written in-session by
 * `node scripts/regulation-tables/build-prior-snapshot.mjs <CODE> <slug>`
 * (full JSON rows, no truncation — `prod-query.mjs` truncates cells to 120
 * chars and is for audits only). When prod is unreachable the executor
 * derives it from the harness seed and passes `--provenance` so the
 * migration header says so and the owner re-captures before applying.
 * WRITTEN, NOT APPLIED.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseFieldConfig, type RegisterUiConfig } from '../../src/lib/eval/field-config';
import { parseCondition, parseNumeric } from '../../src/lib/expr';
import type { FieldConfigEntry, SectionVisibilityEntry, PriorFieldRow, PriorFieldKey, PriorSectionRow, PriorEquationRow, PriorSnapshot } from '../../src/lib/eval/field-configs/types';
import { FIELD_CONFIG_MODULES } from '../../src/lib/eval/field-configs';
import { rewriteRules } from '../../src/lib/eval/rewrites';
import { normalizeSymbol } from '../../src/lib/eval/normalize-formula';
import { q, j, JOIN, SCHEMA_MIGRATION, gatedHeaderLines } from './emit-widget-configs-sql';

/** The prior-snapshot types live in src/lib/eval/field-configs/types.ts (re-exported for the tests and the CLI). */
export type { PriorFieldRow, PriorFieldKey, PriorSectionRow, PriorEquationRow, PriorSnapshot };

/** File-level header options (the Plan-2b `gated` / `gated_note` / `provenance` pattern, one file per slug). */
export type FieldConfigHeader = {
  /** Extra provenance comment PREPENDED above the generated-by line (e.g. the PRIOR-FROM-HARNESS-SEED marker). */
  provenance?: string;
  /** Sign-off id that must be RATIFIED before this migration may be applied. */
  gated?: string;
  /** Free-text rationale emitted as SQL comment lines after the GATED line. */
  gated_note?: string;
};

export const SIGN_OFF_DOC_PLAN_3 = 'docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md';
const LOOKUP_FILL_DATA_TYPES: ReadonlySet<string> = new Set(['number', 'text', 'enum']);
const JSON_COLUMNS = ['enum_values', 'ui_config', 'lookup'] as const;
const RESERVED_KEYS: ReadonlySet<string> = new Set(['sections', 'equations', '_meta']);

/**
 * The read-only prod capture (full-schema form) that `build-prior-snapshot.mjs`
 * runs to build `<slug>.prior.json`; `<CODE>` = standards.code. Documented here
 * so the emitter's contract and the capture stay reviewable side by side — the
 * script additionally nulls the Plan-1 columns when they do not exist yet.
 */
export const PRIOR_SQL = {
  fields: "select w.code as worksheet, f.symbol, f.enum_values, f.widget, f.ui_config, f.lookup, f.visible_when, f.consumer_worksheets, f.data_type, f.section_id, ws.code as section_code from fields f join worksheet_templates w on w.id=f.worksheet_template_id join standards s on s.id=w.standard_id left join worksheet_sections ws on ws.id=f.section_id where s.code='<CODE>' and f.active",
  // EVERY section, null-coded ones included: the fold derives each field's ancestor chain (section_path) from id/parent_section_id
  // and keys the `sections` map by the coded ones only.
  sections: "select w.code as worksheet, ws.id, ws.parent_section_id, ws.code as section_code, p.code as parent_code, ws.visible_when from worksheet_sections ws join worksheet_templates w on w.id=ws.worksheet_template_id join standards s on s.id=w.standard_id left join worksheet_sections p on p.id=ws.parent_section_id where s.code='<CODE>'",
  // Every equation of the standard (Task 3 fix round 1): the producer guard walks input_symbols → output_symbol chains per worksheet.
  equations: "select w.code as worksheet, e.id, e.equation_number, e.output_symbol, e.input_symbols from equations e join worksheet_templates w on w.id=e.worksheet_template_id join standards s on s.id=w.standard_id where s.code='<CODE>'",
};

/** Every captured field row (skips `sections` / `_meta`). */
export function priorFieldRows(prior: PriorSnapshot): Array<[PriorFieldKey, PriorFieldRow]> {
  return (Object.entries(prior) as Array<[string, unknown]>)
    .filter(([k]) => !RESERVED_KEYS.has(k))
    .map(([k, v]) => [k as PriorFieldKey, v as PriorFieldRow]);
}

const isJsonValue = (v: unknown) => v == null || typeof v === 'object';

/**
 * Refuses a prior snapshot whose JSON columns are not object/array/null — a
 * stringified or truncated cell (the `prod-query.mjs` console.table shape)
 * would otherwise be written back by the rollback as a JSON *string*.
 */
export function assertPriorSnapshot(prior: PriorSnapshot): void {
  for (const [key, row] of priorFieldRows(prior)) {
    if (!key.includes(' ')) throw new Error(`prior "${key}": field keys are "<worksheet> <symbol>"`);
    if (row == null || typeof row !== 'object' || Array.isArray(row)) throw new Error(`prior "${key}": row must be an object`);
    for (const col of JSON_COLUMNS) {
      if (!isJsonValue(row[col])) throw new Error(`prior "${key}".${col} must be an object/array/null, got ${typeof row[col]} — re-capture with build-prior-snapshot.mjs (prod-query.mjs truncates cells)`);
    }
    if (row.widget != null && typeof row.widget !== 'string') throw new Error(`prior "${key}".widget must be a string/null`);
    if (row.visible_when != null && typeof row.visible_when !== 'string') throw new Error(`prior "${key}".visible_when must be a string/null`);
    if (row.consumer_worksheets != null && !Array.isArray(row.consumer_worksheets)) throw new Error(`prior "${key}".consumer_worksheets must be an array/null`);
    if (row.section_path != null && !Array.isArray(row.section_path)) throw new Error(`prior "${key}".section_path must be an array`);
  }
  for (const [key, row] of Object.entries(prior.sections ?? {})) {
    if (row == null || typeof row !== 'object') throw new Error(`prior.sections "${key}": row must be an object`);
    if (row.visible_when != null && typeof row.visible_when !== 'string') throw new Error(`prior.sections "${key}".visible_when must be a string/null`);
  }
  for (const [key, row] of Object.entries(prior.equations ?? {})) {
    if (!key.includes(' ')) throw new Error(`prior.equations "${key}": keys are "<worksheet> <equation_number>"`);
    if (row == null || typeof row !== 'object' || Array.isArray(row)) throw new Error(`prior.equations "${key}": row must be an object`);
    if (typeof row.output_symbol !== 'string' || !row.output_symbol) throw new Error(`prior.equations "${key}".output_symbol must be a non-empty string`);
    if (!Array.isArray(row.input_symbols) || row.input_symbols.some((x) => typeof x !== 'string')) throw new Error(`prior.equations "${key}".input_symbols must be a string array`);
    if (row.id != null && typeof row.id !== 'string') throw new Error(`prior.equations "${key}".id must be a string/null`);
  }
}

/**
 * Does hiding `symbol` on `worksheet` hide a value another worksheet inherits — directly (the symbol is a
 * consumed field) or TRANSITIVELY (it feeds a same-worksheet equation whose output, possibly through further
 * same-worksheet equations, is a consumed field)? Returns the chain to name in the refusal, or null. Walked
 * over the captured `prior.equations` (stored `input_symbols` + the Plan-2a `rewriteRules[id].remap`
 * inputs); a prior without `equations` yields the direct answer only. Symbols are matched through the same
 * `normalizeSymbol` as `formula.ts` (`r_D(n)` ↔ `r_D_n`), so a function-like spelling cannot slip past.
 * `opts.skipDirect`: a CREATED field has no consumers of its own but may complete a dangling
 * `input_symbols` reference of a consumed equation — the chain walk still runs for it.
 *
 * Task 12b ruling: the owner worksheet's own code is stripped out of `consumer_worksheets`
 * before this function decides anything — the runtime (`loadInheritedFields`) never inherits a
 * field from its own owner worksheet, so a self-only entry is a no-op at runtime and is not a
 * producer. A chain whose only captured consumer is the owner worksheet itself is therefore NOT
 * refused; a chain consumed by the owner AND another worksheet is still refused, naming only the
 * other worksheet(s).
 */
export function producerChain(prior: PriorSnapshot, worksheet: string, symbol: string, opts: { skipDirect?: boolean } = {}): string | null {
  const consumers = (sym: string): string[] | null => {
    const row = prior[`${worksheet} ${sym}` as PriorFieldKey];
    const others = row?.consumer_worksheets?.filter((w) => w !== worksheet) ?? [];
    return others.length ? others : null;
  };
  if (!opts.skipDirect) {
    const direct = consumers(symbol);
    if (direct) return `${symbol} (consumed by ${direct.join(', ')})`;
  }
  const prefix = `${worksheet} `;
  const eqs = Object.entries(prior.equations ?? {}).filter(([k]) => k.startsWith(prefix)).map(([k, e]) => {
    const remap = e.id ? Object.values(rewriteRules[e.id]?.remap ?? {}) : [];
    const n = k.slice(prefix.length);
    return { label: /^\d/.test(n) ? `Gl.${n}` : n, output: e.output_symbol, inputs: new Set([...e.input_symbols, ...remap].map(normalizeSymbol)) };
  });
  // BFS from the hidden symbol through same-worksheet equations; the first consumed output names the chain.
  const start = normalizeSymbol(symbol);
  const queue: Array<{ sym: string; chain: string }> = [{ sym: start, chain: symbol }];
  const seen = new Set<string>([start]);
  while (queue.length) {
    const { sym, chain } = queue.shift()!;
    for (const e of eqs) {
      const out = normalizeSymbol(e.output);
      if (!e.inputs.has(sym) || seen.has(out)) continue;
      seen.add(out);
      const next = `${chain} → ${e.label} ${e.output}`;
      const c = consumers(e.output) ?? consumers(out);
      if (c) return `${next} (consumed by ${c.join(', ')})`;
      queue.push({ sym: out, chain: next });
    }
  }
  return null;
}

const where = (e: { standard: string; worksheet: string; symbol: string }) =>
  `${JOIN} WHERE f.worksheet_template_id = w.id AND f.symbol = ${q(e.symbol)} AND w.code = ${q(e.worksheet)} AND s.code = ${q(e.standard)} AND f.active`;
const sectionWhere = (s: { standard: string; worksheet: string; section_code: string }) =>
  `${JOIN} WHERE ws.worksheet_template_id = w.id AND ws.code = ${q(s.section_code)} AND w.code = ${q(s.worksheet)} AND s.code = ${q(s.standard)}`;
const jsonOrNull = (v: unknown) => (v == null ? 'NULL' : j(v));
const textOrNull = (v: string | null | undefined) => (v == null ? 'NULL' : q(v));
const NO_PRIOR_NOTE = (key: string) => `-- ${key}: no prior snapshot row captured — restore assumes prod had NULL in these columns; re-capture before applying the rollback.`;

function validateEntry(e: FieldConfigEntry, p: PriorFieldRow | undefined, prior: PriorSnapshot): void {
  const id = `${e.worksheet} ${e.symbol}`;
  const cfg = parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }); // throws FieldConfigError
  if (e.visible_when != null && parseCondition(e.visible_when) === null) throw new Error(`${id}: visible_when does not parse: ${e.visible_when}`);
  if (e.widget === 'register') {
    for (const c of (cfg.ui as RegisterUiConfig).columns) {
      if (c.expr && !parseNumeric(c.expr).ok) throw new Error(`${id}.${c.key}: expr does not parse: ${c.expr}`);
      if (c.visible_when && parseCondition(c.visible_when) === null) throw new Error(`${id}.${c.key}: visible_when does not parse: ${c.visible_when}`);
    }
  }
  if (e.visible_when != null) {
    // A created field has no consumers of its own (direct check skipped) but may complete a dangling input of a consumed equation.
    const chain = producerChain(prior, e.worksheet, e.symbol, { skipDirect: !!e.create });
    if (chain) throw new Error(`${id}: visible_when on a symbol consumed by another worksheet — hides ${chain} (hiding a producer, or an input of a producer, hides the inherited value; STAGE the consumer edit instead)`);
  }
  if (e.widget === 'lookup_fill') {
    const dt = e.create?.data_type ?? p?.data_type;
    if (dt != null && !LOOKUP_FILL_DATA_TYPES.has(dt)) throw new Error(`${id}: lookup_fill needs data_type number|text|enum, got ${dt}`);
  }
  if (e.create) {
    if (!e.create.description.startsWith('Plan 3:')) throw new Error(`${id}: create.description must start with 'Plan 3:' (rollback selector)`);
    if (e.enum_values === 'keep_prod') throw new Error(`${id}: a created field has no prod enum_values to keep`);
    if (p) throw new Error(`${id}: create given but the prior snapshot already has this field — use an UPDATE entry`);
    if (e.create.section_code != null && prior.sections && !(`${e.worksheet} ${e.create.section_code}` in prior.sections)) {
      throw new Error(`${id}: create.section_code ${e.create.section_code} is not a captured section of ${e.worksheet} (the INSERT would land an unsectioned row)`);
    }
    if ((e.widget === 'select_one' || e.widget === 'select_many') && !Array.isArray(e.enum_values)) throw new Error(`${id}: a created ${e.widget} needs an enum_values list`);
  } else {
    // A captured snapshot (_meta present) that lacks the key means the UPDATE would touch 0 rows — same rule as sections.
    if (!p && prior._meta) throw new Error(`${id}: not a captured active field of ${e.worksheet} (its UPDATE would touch 0 rows) — check worksheet/symbol, or add it via create`);
    if (Array.isArray(e.enum_values)) {
      // D-1: a list may only go into a NULL prior — and "NULL" must be a captured fact, never an absent row.
      if (!p) throw new Error(`${id}: D-1 — enum_values given but no prior snapshot row; capture prod (or add the field via create) before emitting`);
      if (p.enum_values != null) throw new Error(`${id}: D-1 — prod enum_values is non-null; use 'keep_prod' and file a sign-off entry`);
    } else if (e.widget === 'select_one' || e.widget === 'select_many') {
      // A select widget without options is an authoring slip: either the entry lists them (into a NULL prior) or prod already has them.
      if (p?.enum_values == null) throw new Error(`${id}: ${e.widget} without options — prod enum_values is ${p ? 'null' : 'not captured'} and the entry lists none`);
    }
  }
}

/**
 * Is the field inside the targeted section OR any of its descendants? The runtime hides every descendant of a
 * hidden section (src/lib/compliance/visibility.ts), so the guard walks the captured ancestor chain. An orphan
 * field (`section_id IS NULL`, `section_path: []`) is never section-hidden. A legacy prior without
 * `section_path` falls back to the own-section code.
 */
function inSectionTree(r: PriorFieldRow, sectionCode: string): boolean {
  if (r.section_id_is_null) return false;
  const path = r.section_path ?? (r.section_code != null ? [r.section_code] : []);
  return path.includes(sectionCode);
}

function validateSection(s: SectionVisibilityEntry, prior: PriorSnapshot): void {
  const key = `${s.worksheet} ${s.section_code}`;
  if (parseCondition(s.visible_when) === null) throw new Error(`section ${key}: visible_when does not parse: ${s.visible_when}`);
  if (prior.sections && !(key in prior.sections)) throw new Error(`section ${key}: not a captured section (its UPDATE would touch 0 rows) — check worksheet_sections.code`);
  const producers = priorFieldRows(prior)
    .filter(([k, r]) => k.startsWith(`${s.worksheet} `) && inSectionTree(r, s.section_code))
    .map(([k]) => producerChain(prior, s.worksheet, k.slice(s.worksheet.length + 1)))
    .filter((chain): chain is string => chain != null);
  if (producers.length) throw new Error(`section ${key}: visible_when on a section (or a descendant of it) containing a symbol consumed by another worksheet: ${producers.join('; ')} (hiding a producer, or an input of a producer, hides the inherited value; STAGE the consumer edit instead)`);
}

export function emitFieldConfigSql(slug: string, entries: FieldConfigEntry[], sections: SectionVisibilityEntry[], prior: PriorSnapshot, header: FieldConfigHeader = {}): { up: string; down: string } {
  assertPriorSnapshot(prior);
  const up = [
    ...(header.provenance ? [`-- ${header.provenance}`] : []),
    `-- Generated by scripts/regulation-tables/emit-field-configs-sql.ts for ${slug} (Plan 3). Regenerate, do not hand-edit.`,
    `-- Source: src/lib/eval/field-configs/${slug}.ts against the prod capture src/lib/eval/field-configs/${slug}.prior.json. Apply AFTER ${SCHEMA_MIGRATION}.`,
    ...(header.gated ? gatedHeaderLines(header.gated, header.gated_note, SIGN_OFF_DOC_PLAN_3) : []),
    'BEGIN;',
  ];
  const down = [
    `-- Generated rollback for ${slug} field configs (scripts/regulation-tables/emit-field-configs-sql.ts). Restores the captured prior; deletes only 'Plan 3:' rows. Regenerate, do not hand-edit.`,
    'BEGIN;',
  ];
  const seen = new Set<string>();
  for (const e of entries) {
    const key: PriorFieldKey = `${e.worksheet} ${e.symbol}`;
    if (seen.has(key)) throw new Error(`${key}: duplicate entry`);
    seen.add(key);
    const p = prior[key];
    validateEntry(e, p, prior);
    if (e.create) {
      const section = e.create.section_code
        ? `(SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = ${q(e.create.section_code)})`
        : '(SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.parent_section_id IS NULL ORDER BY ws.order_index LIMIT 1)';
      // NOT EXISTS is deliberately NOT filtered by f2.active: an inactive row with the same symbol still holds the (template, symbol) unique key.
      up.push(`INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, unit, is_required, clause_reference, description, verification_status, verification_quote, widget, ui_config, lookup, visible_when, enum_values, order_index, active)
SELECT w.id, ${section}, ${q(e.symbol)}, ${q(e.create.label_de)}, ${q(e.create.data_type)}, ${textOrNull(e.create.unit)}, false, ${q(e.create.clause_reference)}, ${q(e.create.description)}, 'imported_unverified', ${q(e.verification_quote)}, ${q(e.widget)}, ${jsonOrNull(e.ui_config)}, ${jsonOrNull(e.lookup)}, ${textOrNull(e.visible_when)}, ${Array.isArray(e.enum_values) ? j(e.enum_values) : 'NULL'}, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM fields f3 WHERE f3.worksheet_template_id = w.id), true
${JOIN} WHERE NOT EXISTS (SELECT 1 FROM fields f2 WHERE f2.worksheet_template_id = w.id AND f2.symbol = ${q(e.symbol)}) AND w.code = ${q(e.worksheet)} AND s.code = ${q(e.standard)};`);
      down.push(`DELETE FROM fields f USING worksheet_templates w, standards s WHERE f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = ${q(e.standard)} AND w.code = ${q(e.worksheet)} AND f.symbol = ${q(e.symbol)} AND f.description LIKE 'Plan 3:%';`);
      continue;
    }
    const sets = [`widget = ${q(e.widget)}`, `ui_config = ${jsonOrNull(e.ui_config)}`, `lookup = ${jsonOrNull(e.lookup)}`, `visible_when = ${textOrNull(e.visible_when)}`];
    const writesEnum = Array.isArray(e.enum_values);
    if (writesEnum) sets.push(`enum_values = ${j(e.enum_values)}`);
    up.push(`UPDATE fields f SET ${sets.join(', ')} ${where(e)};`);
    const restore = [
      `widget = ${textOrNull(p?.widget)}`,
      `ui_config = ${jsonOrNull(p?.ui_config)}`,
      `lookup = ${jsonOrNull(p?.lookup)}`,
      `visible_when = ${textOrNull(p?.visible_when)}`,
    ];
    if (writesEnum) restore.push(`enum_values = ${jsonOrNull(p?.enum_values)}`);
    // A missing prior row cannot be refused (an enum list is — see validateEntry), but the rollback must say what it assumes.
    if (!p) down.push(NO_PRIOR_NOTE(key));
    down.push(`UPDATE fields f SET ${restore.join(', ')} ${where(e)};`);
  }
  const seenSections = new Set<string>();
  for (const s of sections) {
    const key = `${s.worksheet} ${s.section_code}`;
    if (seenSections.has(key)) throw new Error(`section ${key}: duplicate entry`);
    seenSections.add(key);
    validateSection(s, prior);
    up.push(`UPDATE worksheet_sections ws SET visible_when = ${q(s.visible_when)} ${sectionWhere(s)};`);
    const ps = prior.sections?.[key];
    if (!ps) down.push(NO_PRIOR_NOTE(`section ${key}`));
    down.push(`UPDATE worksheet_sections ws SET visible_when = ${textOrNull(ps?.visible_when)} ${sectionWhere(s)};`);
  }
  up.push('COMMIT;'); down.push('COMMIT;');
  return { up: up.join('\n') + '\n', down: down.join('\n') + '\n' };
}

/** Migration + rollback file paths for a slug and timestamp (relative to the repo root). */
export function fieldConfigFilesFor(slug: string, ts: string): { migration: string; rollback: string } {
  if (!/^\d{14}$/.test(ts)) throw new Error(`timestamp must be 14 digits, got ${JSON.stringify(ts)}`);
  return {
    migration: `scripts/migrations/${ts}_field_configs_${slug}.sql`,
    rollback: `scripts/rollback-${ts}-field-configs-${slug.replace(/_/g, '-')}.sql`,
  };
}

/** Parses `[--gated <id>] [--provenance "<line>"]`; a flag without a value is an error. */
export function parseHeaderArgs(rest: readonly string[]): FieldConfigHeader {
  const header: FieldConfigHeader = {};
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    if (flag !== '--gated' && flag !== '--provenance') throw new Error(`unknown argument ${flag}`);
    const value = rest[i + 1];
    if (value == null || value.startsWith('--')) throw new Error(`${flag} needs a value`);
    if (flag === '--gated') header.gated = value; else header.provenance = value;
    i++;
  }
  return header;
}

/** Reads and validates `<slug>.prior.json` (shape + JSON-column sanity). */
export function loadPriorSnapshot(path: string): PriorSnapshot {
  if (!existsSync(path)) throw new Error(`missing prior snapshot ${path} — capture prod first: node scripts/regulation-tables/build-prior-snapshot.mjs <CODE> <slug>`);
  const prior = JSON.parse(readFileSync(path, 'utf8')) as PriorSnapshot;
  assertPriorSnapshot(prior);
  return prior;
}

if (process.argv[1]?.endsWith('emit-field-configs-sql.ts')) {
  // CLI: tsx scripts/regulation-tables/emit-field-configs-sql.ts <slug> <ts> [--gated <sign-off id>] [--provenance "<line 1>"]
  // Reads src/lib/eval/field-configs/<slug>.ts (via FIELD_CONFIG_MODULES) + <slug>.prior.json.
  const [slug = '', ts = '', ...rest] = process.argv.slice(2);
  const load = FIELD_CONFIG_MODULES[slug];
  if (!load) throw new Error(`unknown field-config slug ${JSON.stringify(slug)} — known: ${Object.keys(FIELD_CONFIG_MODULES).join(', ') || '(none)'}`);
  const files = fieldConfigFilesFor(slug, ts);
  const header = parseHeaderArgs(rest);
  const prior = loadPriorSnapshot(`src/lib/eval/field-configs/${slug}.prior.json`);
  if (!prior.equations) console.error(`warning: ${slug}.prior.json carries no "equations" map — the producer guard is direct-only; re-capture with build-prior-snapshot.mjs for the transitive check`);
  // Task 12b: a self-entry in a field's own consumer_worksheets is a prod data oddity (the runtime
  // never inherits a field from its own owner worksheet) — the guard ignores it, but it is worth
  // recording so the executor can file it as an X-class observation when it next touches the standard.
  const selfConsumed = priorFieldRows(prior)
    .filter(([key, row]) => row.consumer_worksheets?.includes(key.slice(0, key.indexOf(' '))))
    .map(([key]) => key);
  if (selfConsumed.length) console.error(`NOTICE: prod data oddity — self-consumer ignored: ${selfConsumed.join(', ')}`);
  load().then((m) => {
    const { up, down } = emitFieldConfigSql(slug, m.FIELD_CONFIGS, m.SECTION_VISIBILITY, prior, header);
    writeFileSync(files.migration, up);
    writeFileSync(files.rollback, down);
    console.log(`wrote ${m.FIELD_CONFIGS.length} field entries + ${m.SECTION_VISIBILITY.length} section entries for ${slug} ->`, files.migration, files.rollback);
  }).catch((err) => { console.error(err); process.exit(1); });
}
