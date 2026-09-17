/**
 * Plan 3 Task 0 — the field-config emitter: the Plan-2b widget emitter
 * (`emit-widget-configs-sql.ts`, whose `q`/`j`/`JOIN`/`sqlComment`/
 * `gatedHeaderLines` primitives and per-entry UPDATE scoping it reuses)
 * generalised to the DATA a Plan-3 standard task writes:
 *
 *   - one `UPDATE fields` per entry, scoped standard + worksheet + symbol,
 *     ALWAYS writing `widget`, `ui_config`, `lookup`, `visible_when`;
 *   - `enum_values` written only into a NULL prior (owner ruling D-1 — a
 *     non-null prod list is never overwritten; the entry says `'keep_prod'`
 *     and files a sign-off entry when the printed list differs);
 *   - a `visible_when` on a symbol that another worksheet consumes
 *     (`consumer_worksheets` non-empty in the prior snapshot) is REFUSED
 *     (importer rule, Plan 2a Task 10 — hiding a producer would hide the
 *     value its consumers inherit);
 *   - `UPDATE worksheet_sections` per section entry, keyed by worksheet code +
 *     section code (a section whose prod `code IS NULL` cannot be keyed —
 *     the task records it in its STAGED file instead);
 *   - `create` entries INSERT additively (`WHERE NOT EXISTS`), never touching
 *     an existing row; the `Plan 3:` description prefix is the rollback
 *     selector so the rollback deletes only what this migration created;
 *   - the rollback restores every touched field's four columns (and
 *     `enum_values` when written) to the captured prior, byte-for-byte.
 *
 * Every entry is validated before a single statement is emitted: zod
 * (`parseFieldConfig`), condition/expr parse of `visible_when` and of every
 * register column's `expr` / `visible_when`, the D-1 and consumed-producer
 * guards, the `lookup_fill` data_type rule (amendment C).
 *
 * The prior snapshot (`src/lib/eval/field-configs/<slug>.prior.json`) is a
 * READ-ONLY capture of prod taken in-session by
 * `node scripts/verification/prod-query.mjs --sql "…"` (see `PRIOR_SQL`); when
 * prod is unreachable the executor derives it from the harness seed and marks
 * the migration header (`header.provenance`) so the owner re-captures before
 * applying. WRITTEN, NOT APPLIED.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseFieldConfig, type RegisterUiConfig } from '../../src/lib/eval/field-config';
import { parseCondition, parseNumeric } from '../../src/lib/expr';
import type { FieldConfigEntry, SectionVisibilityEntry } from '../../src/lib/eval/field-configs/types';
import { FIELD_CONFIG_MODULES } from '../../src/lib/eval/field-configs';
import { q, j, JOIN, SCHEMA_MIGRATION, gatedHeaderLines } from './emit-widget-configs-sql';

export type PriorFieldRow = {
  enum_values: unknown; widget: string | null; ui_config: unknown; lookup: unknown; visible_when: string | null;
  consumer_worksheets: string[] | null;
  /** Optional in the capture; when present, the amendment-C data_type rule is checked for lookup_fill entries. */
  data_type?: string;
};
/** Field-row key: `${worksheet} ${symbol}` (always contains a space, so it never collides with the `sections` property). */
export type PriorFieldKey = `${string} ${string}`;
export type PriorSnapshot = { [key: PriorFieldKey]: PriorFieldRow }
  & { sections?: Record<string /* `${worksheet} ${section_code}` */, { visible_when: string | null }> };

/** File-level header options (the Plan-2b `gated` / `gated_note` / `provenance` pattern, one file per slug). */
export type FieldConfigHeader = {
  /** Custom line-1 provenance comment (e.g. the PRIOR-FROM-HARNESS-SEED marker); defaults to the generated-by line. */
  provenance?: string;
  /** Sign-off id that must be RATIFIED before this migration may be applied. */
  gated?: string;
  /** Free-text rationale emitted as SQL comment lines after the GATED line. */
  gated_note?: string;
};

export const SIGN_OFF_DOC_PLAN_3 = 'docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-3.md';
const LOOKUP_FILL_DATA_TYPES: ReadonlySet<string> = new Set(['number', 'text', 'enum']);

/** The read-only prod capture the executor runs (prod-query.mjs) to build `<slug>.prior.json`; `<CODE>` = standards.code. */
export const PRIOR_SQL = {
  fields: "select w.code as worksheet, f.symbol, f.enum_values, f.widget, f.ui_config, f.lookup, f.visible_when, f.consumer_worksheets, f.data_type from fields f join worksheet_templates w on w.id=f.worksheet_template_id join standards s on s.id=w.standard_id where s.code='<CODE>' and f.active",
  sections: "select w.code as worksheet, ws.code as section_code, ws.visible_when from worksheet_sections ws join worksheet_templates w on w.id=ws.worksheet_template_id join standards s on s.id=w.standard_id where s.code='<CODE>' and ws.code is not null",
};

const where = (e: { standard: string; worksheet: string; symbol: string }) =>
  `${JOIN} WHERE f.worksheet_template_id = w.id AND f.symbol = ${q(e.symbol)} AND w.code = ${q(e.worksheet)} AND s.code = ${q(e.standard)}`;
const sectionWhere = (s: { standard: string; worksheet: string; section_code: string }) =>
  `${JOIN} WHERE ws.worksheet_template_id = w.id AND ws.code = ${q(s.section_code)} AND w.code = ${q(s.worksheet)} AND s.code = ${q(s.standard)}`;
const jsonOrNull = (v: unknown) => (v == null ? 'NULL' : j(v));
const textOrNull = (v: string | null | undefined) => (v == null ? 'NULL' : q(v));

function validateEntry(e: FieldConfigEntry, p: PriorFieldRow | undefined): void {
  const cfg = parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }); // throws FieldConfigError
  if (e.visible_when != null && parseCondition(e.visible_when) === null) throw new Error(`${e.worksheet} ${e.symbol}: visible_when does not parse: ${e.visible_when}`);
  if (e.widget === 'register') {
    for (const c of (cfg.ui as RegisterUiConfig).columns) {
      if (c.expr && !parseNumeric(c.expr).ok) throw new Error(`${e.worksheet} ${e.symbol}.${c.key}: expr does not parse: ${c.expr}`);
      if (c.visible_when && parseCondition(c.visible_when) === null) throw new Error(`${e.worksheet} ${e.symbol}.${c.key}: visible_when does not parse: ${c.visible_when}`);
    }
  }
  if (e.visible_when != null && p?.consumer_worksheets?.length) {
    throw new Error(`${e.worksheet} ${e.symbol}: visible_when on a symbol consumed by ${p.consumer_worksheets.join(', ')} (hiding a producer hides the inherited value; STAGE the consumer edit instead)`);
  }
  if (e.widget === 'lookup_fill') {
    const dt = e.create?.data_type ?? p?.data_type;
    if (dt != null && !LOOKUP_FILL_DATA_TYPES.has(dt)) throw new Error(`${e.worksheet} ${e.symbol}: lookup_fill needs data_type number|text|enum, got ${dt}`);
  }
  if (e.create) {
    if (!e.create.description.startsWith('Plan 3:')) throw new Error(`${e.worksheet} ${e.symbol}: create.description must start with 'Plan 3:' (rollback selector)`);
    if (e.enum_values === 'keep_prod') throw new Error(`${e.worksheet} ${e.symbol}: a created field has no prod enum_values to keep`);
    if (p) throw new Error(`${e.worksheet} ${e.symbol}: create given but the prior snapshot already has this field — use an UPDATE entry`);
  } else if (Array.isArray(e.enum_values)) {
    // D-1: a list may only go into a NULL prior — and "NULL" must be a captured fact, never an absent row.
    if (!p) throw new Error(`${e.worksheet} ${e.symbol}: D-1 — enum_values given but no prior snapshot row; capture prod (or add the field via create) before emitting`);
    if (p.enum_values != null) throw new Error(`${e.worksheet} ${e.symbol}: D-1 — prod enum_values is non-null; use 'keep_prod' and file a sign-off entry`);
  }
}

export function emitFieldConfigSql(slug: string, entries: FieldConfigEntry[], sections: SectionVisibilityEntry[], prior: PriorSnapshot, header: FieldConfigHeader = {}): { up: string; down: string } {
  const up = [
    header.provenance ?? `-- Generated by scripts/regulation-tables/emit-field-configs-sql.ts for ${slug} (Plan 3). Regenerate, do not hand-edit.`,
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
    validateEntry(e, p);
    if (e.create) {
      const section = e.create.section_code
        ? `(SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.code = ${q(e.create.section_code)})`
        : '(SELECT ws.id FROM worksheet_sections ws WHERE ws.worksheet_template_id = w.id AND ws.parent_section_id IS NULL ORDER BY ws.order_index LIMIT 1)';
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
    if (!p) down.push(`-- ${key}: no prior snapshot row captured — restore assumes prod had NULL in these columns; re-capture before applying the rollback.`);
    down.push(`UPDATE fields f SET ${restore.join(', ')} ${where(e)};`);
  }
  const seenSections = new Set<string>();
  for (const s of sections) {
    const key = `${s.worksheet} ${s.section_code}`;
    if (seenSections.has(key)) throw new Error(`section ${key}: duplicate entry`);
    seenSections.add(key);
    if (parseCondition(s.visible_when) === null) throw new Error(`section ${key}: visible_when does not parse: ${s.visible_when}`);
    up.push(`UPDATE worksheet_sections ws SET visible_when = ${q(s.visible_when)} ${sectionWhere(s)};`);
    const ps = prior.sections?.[key];
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

if (process.argv[1]?.endsWith('emit-field-configs-sql.ts')) {
  // CLI: tsx scripts/regulation-tables/emit-field-configs-sql.ts <slug> <ts> [--gated <sign-off id>] [--provenance "<line 1>"]
  // Reads src/lib/eval/field-configs/<slug>.ts (via FIELD_CONFIG_MODULES) + <slug>.prior.json.
  const [slug = '', ts = '', ...rest] = process.argv.slice(2);
  const load = FIELD_CONFIG_MODULES[slug];
  if (!load) throw new Error(`unknown field-config slug ${JSON.stringify(slug)} — known: ${Object.keys(FIELD_CONFIG_MODULES).join(', ') || '(none)'}`);
  const files = fieldConfigFilesFor(slug, ts);
  const priorPath = `src/lib/eval/field-configs/${slug}.prior.json`;
  if (!existsSync(priorPath)) throw new Error(`missing prior snapshot ${priorPath} — capture prod first (PRIOR_SQL in this file)`);
  const header: FieldConfigHeader = {};
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--gated') header.gated = rest[++i];
    else if (rest[i] === '--provenance') header.provenance = rest[++i];
    else throw new Error(`unknown argument ${rest[i]}`);
  }
  load().then((m) => {
    const prior = JSON.parse(readFileSync(priorPath, 'utf8')) as PriorSnapshot;
    const { up, down } = emitFieldConfigSql(slug, m.FIELD_CONFIGS, m.SECTION_VISIBILITY, prior, header);
    writeFileSync(files.migration, up);
    writeFileSync(files.rollback, down);
    console.log(`wrote ${m.FIELD_CONFIGS.length} field entries + ${m.SECTION_VISIBILITY.length} section entries for ${slug} ->`, files.migration, files.rollback);
  }).catch((err) => { console.error(err); process.exit(1); });
}
