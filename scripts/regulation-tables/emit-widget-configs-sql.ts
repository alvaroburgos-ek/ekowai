/**
 * Plan 2b Task 5 — emits the widget/ui_config/lookup migrations for the
 * symbols whose editors moved from bespoke React to the generic
 * register / reference / lookup_fill renderers, FROM the TS fallback configs
 * that serve those symbols while `fields.widget IS NULL`.
 *
 * The committed SQL under scripts/migrations/ is pinned byte-for-byte against
 * a fresh call of this emitter (scripts/__tests__/widget-configs-sql-freshness
 * .test.ts), so the DB row a migration writes is exactly the object the code
 * already renders (deploy-before-migration parity). WRITTEN, NOT APPLIED —
 * applying to `vadsmshzebefjreqcicl` is the owner's stamp.
 *
 * Invariants (pinned by the tests):
 *   - each UP sets `widget`, `ui_config` and (lookup_fill only) `lookup` —
 *     NEVER `data_type` (three saveWorksheet readers of rainfall_table_ref
 *     accept a text value only) and NEVER `enum_values` (Plan-1 D-1);
 *   - each UP is scoped by symbol + standard code and only fills rows
 *     `WHERE f.widget IS NULL` (re-runnable; a hand-set widget is never
 *     overwritten);
 *   - the single rollback restores widget/ui_config/lookup to NULL — the
 *     correct prior state because none of these symbols is among the Plan-1
 *     selection entries (selection-config-entries.json) — and is guarded by
 *     `WHERE f.widget = '<widget the UP wrote>'`, so a later manual change to
 *     another widget is not clobbered by a stale rollback;
 *   - `gated` marks a migration that must NOT be applied before the named
 *     sign-off is ratified; `gated_note` carries the free-text rationale that
 *     follows the GATED line (each line becomes an SQL comment) so a gated
 *     migration's full header is reproducible by the freshness pin;
 *   - `template_code` additionally scopes the UP and its rollback to the
 *     symbol's home worksheet template (`w.code`);
 *   - `provenance` replaces the generated-by line 1 (no entry uses it today;
 *     kept for a migration whose header must name a different origin). Since
 *     the Plan 2b close-out ALL four files are emitter-owned and byte-pinned —
 *     the former `hand_authored` skip (Task 7's interim header) is gone.
 *
 * Apply order (after 20260911100000_guideline_to_tool_schema.sql and the Plan
 * 2a data migrations): the entries below in array order; a GATED entry is
 * EXCLUDED from the apply list until its sign-off is ratified. The combined
 * rollback `scripts/rollback-20260916130000-widget-configs.sql` is the ONE
 * canonical rollback for all four (reverse order inside; the gated entry's
 * statement is a no-op while its migration is unapplied).
 *
 * Plan 3 Task 0 generalises this emitter: `emit-field-configs-sql.ts` reuses
 * the exported `q`/`j`/`JOIN`/`sqlComment`/`gatedHeaderLines` primitives and
 * the same per-entry UPDATE scoping (standard + worksheet + symbol), adding
 * `visible_when`, `worksheet_sections`, the D-1 `enum_values` guard and the
 * consumed-producer refusal. This file keeps owning the four Plan-2b files.
 */
import { writeFileSync } from 'node:fs';
import { REGISTER_CONFIGS_FALLBACK } from '../../src/lib/eval/register-configs';
import { REFERENCE_CONFIGS_FALLBACK } from '../../src/lib/eval/reference-configs';
import { LOOKUP_BINDINGS_FALLBACK } from '../../src/lib/eval/lookup-fill';

export type WidgetEntry = {
  /** Migration file name without `.sql` (its timestamp prefix is the apply order). */
  file: string;
  /** `standards.code` the UPDATE is scoped to. */
  standard: string;
  /** `fields.symbol` the UPDATE is scoped to. */
  symbol: string;
  widget: 'register' | 'reference' | 'lookup_fill';
  /** Written to `fields.ui_config` (NULL when null). */
  ui_config: unknown;
  /** Written to `fields.lookup` when present (lookup_fill only). */
  lookup?: unknown;
  /** The TS fallback constant this migration retires once applied (header text). */
  retires: string;
  /** Sign-off id that must be RATIFIED before this migration may be applied. */
  gated?: string;
  /** Free-text rationale emitted as SQL comment lines directly after the GATED line. */
  gated_note?: string;
  /** Home worksheet template (`worksheet_templates.code`); when set, UP + rollback add `AND w.code = '<code>'`. */
  template_code?: string;
  /** Custom line-1 provenance comment (defaults to the generated-by line). */
  provenance?: string;
};

/** SQL string literal (single quotes doubled). */
export const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
/** SQL jsonb literal from any JSON-serialisable value. */
export const j = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
/** The Plan-1 schema migration every widget/field-config migration must follow. */
export const SCHEMA_MIGRATION = '20260911100000_guideline_to_tool_schema.sql';
const SIGN_OFF_DOC = 'docs/superpowers/specs/2026-09-11-guideline-to-tool/SIGN-OFF-plan-2b.md';
/** Template ⋈ standard join shared by every `UPDATE fields f` these emitters write. */
export const JOIN = 'FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id';
const DEFAULT_PROVENANCE = '-- Generated by scripts/regulation-tables/emit-widget-configs-sql.ts from the TS fallback config (Plan 2b). Regenerate, do not hand-edit.';
/** WHERE clause shared by UP and rollback: symbol + standard code (+ home template when given). */
const scope = (e: WidgetEntry) =>
  `WHERE f.symbol = ${q(e.symbol)} AND s.code = ${q(e.standard)}${e.template_code ? ` AND w.code = ${q(e.template_code)}` : ''} AND f.worksheet_template_id = w.id`;

const AC_AS_RATIO_LIMIT_GATED_NOTE = `
Why gated (Plan 2b Task 7): the binding's key symbols \`tab6_tier\` and \`bbz_band\` do NOT exist as fields on
DWA-A-138-1 today. The server materialiser (src/lib/eval/materialize-tab6-loading.ts, five call sites in
src/lib/actions/worksheet.ts) derives them internally (flaechengruppe -> TAB5 tier; bbz_thickness >= 0,30 m ->
band) and UPSERTs \`ac_as_ratio_limit\` as source_type='derived'. The widget therefore renders the symbol in
DISPLAY mode (LOADING_CHECK_SYMBOLS marks it server-owned): persisted value read-only, badge names the source
only — "Tab. 6 (Grenzwert)" (key diagnostics are fill-mode information), no client write. Applying this migration changes
NOTHING the engineer sees (the TS fallback serves the identical binding while widget IS NULL) — it only moves
the binding from code to data. The owner rules D-2b-3 between:
  (a) two derived scalar fields + two equation rows on A138-12:
      tab6_tier = lookup('TAB5', flaechengruppe, 'tier'); bbz_band = if(bbz_thickness >= 0.30, 'thick', 'thin')
      — the 0,30 m is THICK_BAND_M (src/lib/eval/tab6-loading.ts); needs the §5.2.3.2 Tab. 6 quote captured
      in-session (SR-1) before the equation rows are written; then the badge resolves and the widget could take
      over production from the materialiser (a separate ownership cut-over, not this migration);
  (b) a \`from_expr\` key on LookupBinding (zod extension, field-config.ts) so a key can be an expression instead
      of a symbol — no new fields, but a contract change to the Plan-1 binding shape;
  (c) leave the widget in display mode with the keys_missing badge and the server materialiser as the single
      producer (the CURRENT state; this migration is then cosmetic and may be applied or left unapplied).
Scope: the HOME template only (w.code = 'A138-12'). An inherited copy of the symbol on a consumer worksheet is the
SAME fields row (inheritance is by reference, not a second row), so this scope is about which template's field
row carries the binding; display-only for inherited copies is enforced by the component (inheritedFromWorksheet
!= null ⇒ display mode), not by this WHERE clause.
Rollback: the combined scripts/rollback-20260916130000-widget-configs.sql (canonical; its ac_as_ratio_limit statement
mirrors this scope and is a no-op while this migration is unapplied).`;

/** The four Plan 2b widget migrations, in apply order. */
export const WIDGET_MIGRATION_ENTRIES: readonly WidgetEntry[] = [
  {
    file: '20260916130000_a138_07_surface_inventory_widget', standard: 'DWA-A-138-1', symbol: 'surface_inventory', widget: 'register',
    ui_config: REGISTER_CONFIGS_FALLBACK.surface_inventory,
    retires: 'REGISTER_CONFIGS_FALLBACK.surface_inventory (src/lib/eval/register-configs.ts)',
  },
  {
    file: '20260916140000_vsme_b04_pollutant_register_widget', standard: 'VSME', symbol: 'pollutant_register', widget: 'register',
    ui_config: REGISTER_CONFIGS_FALLBACK.pollutant_register,
    // The register-level flags travel INSIDE ui_config.flags (2b Task 1); the former symbol-keyed REGISTER_FLAG_KEYS map is deleted.
    retires: 'REGISTER_CONFIGS_FALLBACK.pollutant_register (src/lib/eval/register-configs.ts)',
  },
  {
    file: '20260916150000_a138_rainfall_table_ref_reference', standard: 'DWA-A-138-1', symbol: 'rainfall_table_ref', widget: 'reference',
    ui_config: REFERENCE_CONFIGS_FALLBACK.rainfall_table_ref,
    retires: 'REFERENCE_CONFIGS_FALLBACK.rainfall_table_ref (src/lib/eval/reference-configs.ts)',
  },
  {
    file: '20260916160000_a138_12_ac_as_ratio_limit_lookup_fill', standard: 'DWA-A-138-1', symbol: 'ac_as_ratio_limit', widget: 'lookup_fill',
    ui_config: null, lookup: LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit,
    retires: 'LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit (src/lib/eval/lookup-fill.ts)',
    gated: 'D-2b-3', gated_note: AC_AS_RATIO_LIMIT_GATED_NOTE, template_code: 'A138-12',
    // Originally hand-authored by Plan 2b Task 7; emitter-owned since the Plan 2b close-out (Task 10) — the
    // committed file is byte-pinned against this entry like the other three.
  },
];

/** One free-text line as an SQL comment line (an empty line stays a bare `--`). */
export const sqlComment = (line: string) => (line === '' ? '--' : `-- ${line}`);

/** The GATED header: the sign-off id line, then the free-text rationale as comment lines. */
export function gatedHeaderLines(gated: string, note: string | undefined, signOffDoc: string): string[] {
  return [
    `-- GATED: do not apply before sign-off ${gated} is RATIFIED (${signOffDoc}).`,
    ...(note != null ? note.split('\n').map(sqlComment) : []),
  ];
}

export function emitWidgetConfigSql(entries: readonly WidgetEntry[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of entries) {
    if (out.has(e.file)) throw new Error(`duplicate migration file ${e.file}`);
    const sets = [`widget = ${q(e.widget)}`, `ui_config = ${e.ui_config == null ? 'NULL' : j(e.ui_config)}`];
    if (e.lookup !== undefined) sets.push(`lookup = ${j(e.lookup)}`);
    const lines = [
      e.provenance ?? DEFAULT_PROVENANCE,
      `-- Retires: ${e.retires} once applied. Apply AFTER ${SCHEMA_MIGRATION}.`,
      ...(e.gated ? gatedHeaderLines(e.gated, e.gated_note, SIGN_OFF_DOC) : []),
      'BEGIN;',
      `UPDATE fields f SET ${sets.join(', ')} ${JOIN} ${scope(e)} AND f.widget IS NULL;`,
      'COMMIT;',
    ];
    out.set(e.file, lines.join('\n') + '\n');
  }
  return out;
}

export function emitWidgetRollbackSql(entries: readonly WidgetEntry[]): string {
  const lines = [
    '-- Generated rollback for the Plan 2b widget migrations (scripts/regulation-tables/emit-widget-configs-sql.ts; reverse apply order). Regenerate, do not hand-edit.',
    '-- Restores widget/ui_config/lookup to NULL — the prior state, because none of these symbols carries a Plan-1 selection config',
    '-- (scripts/regulation-tables/selection-config-entries.json) and every forward migration only filled rows WHERE widget IS NULL.',
    "-- Each statement is guarded by `f.widget = '<widget the forward migration wrote>'` so a row whose widget was later changed by hand",
    '-- is left alone; a never-applied (e.g. still GATED) forward migration makes its rollback statement a no-op. Idempotent + re-runnable.',
    '-- CODE note: with widget NULL again the TS fallbacks (REGISTER_CONFIGS_FALLBACK / REFERENCE_CONFIGS_FALLBACK / LOOKUP_BINDINGS_FALLBACK)',
    '-- serve the identical config — the engineer sees the same widgets either way. NOT a forward migration: lives in scripts/, never auto-applied.',
    'BEGIN;',
  ];
  for (const e of [...entries].reverse()) {
    lines.push(`UPDATE fields f SET widget = NULL, ui_config = NULL, lookup = NULL ${JOIN} ${scope(e)} AND f.widget = ${q(e.widget)};`);
  }
  lines.push('COMMIT;');
  return lines.join('\n') + '\n';
}

if (process.argv[1]?.endsWith('emit-widget-configs-sql.ts')) {
  // `--all` is accepted for backwards compatibility (it used to bypass the Task-7 hand-authored skip); every
  // entry is emitter-owned now, so the CLI always writes all four files + the combined rollback.
  let written = 0;
  for (const [file, sql] of emitWidgetConfigSql(WIDGET_MIGRATION_ENTRIES)) {
    writeFileSync(`scripts/migrations/${file}.sql`, sql);
    written++;
  }
  writeFileSync('scripts/rollback-20260916130000-widget-configs.sql', emitWidgetRollbackSql(WIDGET_MIGRATION_ENTRIES));
  console.log(`wrote ${written} widget migrations + rollback`);
}
