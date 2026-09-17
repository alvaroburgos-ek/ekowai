/**
 * Plan 2b Task 5 — freshness pin for the widget/ui_config/lookup migrations.
 *
 * The four migrations are EMITTED from the TS fallback configs (register /
 * reference / lookup_fill) — never hand-written — so the committed SQL must
 * byte-equal a fresh emitter call (same pattern as generated-sql-freshness
 * .test.ts for Plan 1). The embedded JSON must also round-trip through
 * `parseFieldConfig` to the very object the fallback serves while
 * `widget IS NULL` (deploy-before-migration parity: the engineer sees the
 * same widget before and after apply). WRITTEN NOT APPLIED.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { emitWidgetConfigSql, emitWidgetRollbackSql, WIDGET_MIGRATION_ENTRIES } from '../regulation-tables/emit-widget-configs-sql';
import { parseFieldConfig } from '../../src/lib/eval/field-config';
import { REGISTER_CONFIGS_FALLBACK } from '../../src/lib/eval/register-configs';
import { REFERENCE_CONFIGS_FALLBACK } from '../../src/lib/eval/reference-configs';
import { LOOKUP_BINDINGS_FALLBACK } from '../../src/lib/eval/lookup-fill';

const ROOT = join(__dirname, '..', '..');
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const read = (rel: string) => norm(readFileSync(join(ROOT, rel), 'utf8'));
const ROLLBACK = 'scripts/rollback-20260916130000-widget-configs.sql';

describe('widget-config migrations — committed files equal a fresh emitter call (Plan 2b)', () => {
  it('four entries, apply order by timestamp', () => {
    expect(WIDGET_MIGRATION_ENTRIES.map((e) => e.file)).toEqual([
      '20260916130000_a138_07_surface_inventory_widget',
      '20260916140000_vsme_b04_pollutant_register_widget',
      '20260916150000_a138_rainfall_table_ref_reference',
      '20260916160000_a138_12_ac_as_ratio_limit_lookup_fill',
    ]);
  });

  it('every emitter-owned migration file + the combined rollback match the emitter byte-for-byte', () => {
    const files = emitWidgetConfigSql(WIDGET_MIGRATION_ENTRIES);
    expect(files.size).toBe(WIDGET_MIGRATION_ENTRIES.length);
    const owned = WIDGET_MIGRATION_ENTRIES.filter((e) => !e.hand_authored);
    expect(owned.map((e) => e.file)).toEqual([
      '20260916130000_a138_07_surface_inventory_widget',
      '20260916140000_vsme_b04_pollutant_register_widget',
      '20260916150000_a138_rainfall_table_ref_reference',
    ]);
    for (const e of owned) expect(norm(files.get(e.file)!), e.file).toBe(read(`scripts/migrations/${e.file}.sql`));
    expect(norm(emitWidgetRollbackSql(WIDGET_MIGRATION_ENTRIES))).toBe(read(ROLLBACK));
  });

  // DEFERRED (controller coordination note, Task 5): Task 7 is concurrently editing the header of its hand-authored
  // migration (provenance line 1, badge wording, `AND w.code = 'A138-12'` home-template scope). The emitter can
  // already reproduce that shape (`provenance`, `gated_note`, `template_code`); once Task 7's fix has landed, set the
  // entry's `provenance`/`gated_note` to the final text, run `pnpm tsx scripts/regulation-tables/emit-widget-configs-sql.ts --all`
  // and replace this todo with the exact byte-pin.
  it.todo('20260916160000_a138_12_ac_as_ratio_limit_lookup_fill.sql matches the emitter byte-for-byte (after the Task 7 header fix lands)');

  it('the hand-authored ac_as_ratio_limit migration carries the same GATED / D-2b-3 options / UPDATE shape the emitter produces', () => {
    const committed = read('scripts/migrations/20260916160000_a138_12_ac_as_ratio_limit_lookup_fill.sql');
    const emitted = emitWidgetConfigSql(WIDGET_MIGRATION_ENTRIES).get('20260916160000_a138_12_ac_as_ratio_limit_lookup_fill')!;
    for (const sql of [committed, emitted]) {
      expect(sql).toMatch(/^-- GATED: do not apply before sign-off D-2b-3 is RATIFIED/m);
      expect(sql).toMatch(/\(a\) two derived scalar fields/);
      expect(sql).toMatch(/\(b\) a `from_expr` key/);
      expect(sql).toMatch(/\(c\) leave the widget in display mode/);
      expect(sql).toContain("SET widget = 'lookup_fill', ui_config = NULL, lookup = '");
      expect(sql).toContain("f.symbol = 'ac_as_ratio_limit' AND s.code = 'DWA-A-138-1'");
      expect(sql).toContain('AND f.widget IS NULL;');
    }
    // Same embedded binding, whichever header wins.
    const json = (sql: string) => JSON.parse(/lookup = '((?:[^']|'')*)'::jsonb/.exec(sql)![1].replace(/''/g, "'"));
    expect(json(committed)).toEqual(json(emitted));
  });

  it('the embedded ui_config / lookup round-trip through parseFieldConfig to the TS fallback (deploy-before-migration parity)', () => {
    const json = (sql: string, col: 'ui_config' | 'lookup') => JSON.parse(new RegExp(`${col} = '((?:[^']|'')*)'::jsonb`).exec(sql)![1].replace(/''/g, "'"));
    const files = emitWidgetConfigSql(WIDGET_MIGRATION_ENTRIES);
    const surf = json(files.get('20260916130000_a138_07_surface_inventory_widget')!, 'ui_config');
    expect(parseFieldConfig({ widget: 'register', uiConfig: surf, lookup: null, visibleWhen: null }).ui).toEqual(REGISTER_CONFIGS_FALLBACK.surface_inventory);
    const poll = json(files.get('20260916140000_vsme_b04_pollutant_register_widget')!, 'ui_config');
    expect(parseFieldConfig({ widget: 'register', uiConfig: poll, lookup: null, visibleWhen: null }).ui).toEqual(REGISTER_CONFIGS_FALLBACK.pollutant_register);
    const ref = json(files.get('20260916150000_a138_rainfall_table_ref_reference')!, 'ui_config');
    expect(parseFieldConfig({ widget: 'reference', uiConfig: ref, lookup: null, visibleWhen: null }).ui).toEqual(REFERENCE_CONFIGS_FALLBACK.rainfall_table_ref);
    const lf = files.get('20260916160000_a138_12_ac_as_ratio_limit_lookup_fill')!;
    expect(lf).toContain('ui_config = NULL');
    expect(parseFieldConfig({ widget: 'lookup_fill', uiConfig: null, lookup: json(lf, 'lookup'), visibleWhen: null }).lookup).toEqual(LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit);
    expect(lf).toMatch(/^-- GATED: do not apply before sign-off D-2b-3/m);
  });

  it('only the ac_as_ratio_limit migration is gated; the other three carry no GATED line', () => {
    const files = emitWidgetConfigSql(WIDGET_MIGRATION_ENTRIES);
    for (const [file, sql] of files) {
      const gated = /^-- GATED:/m.test(sql);
      expect(gated, file).toBe(file === '20260916160000_a138_12_ac_as_ratio_limit_lookup_fill');
    }
    expect(WIDGET_MIGRATION_ENTRIES.filter((e) => e.gated).map((e) => e.symbol)).toEqual(['ac_as_ratio_limit']);
  });

  it('no stray 20260916[13-16]0000 widget migration exists beyond the entries', () => {
    const files = readdirSync(join(ROOT, 'scripts/migrations')).filter((f) => /^202609161[3-6]0000_/.test(f));
    expect(files.sort()).toEqual(WIDGET_MIGRATION_ENTRIES.map((e) => `${e.file}.sql`).sort());
  });

  it('PIN (controller amendment): no migration or rollback of this task touches fields.data_type or enum_values', () => {
    // Three saveWorksheet readers of rainfall_table_ref accept a text value only, and Plan-1 D-1
    // forbids writing enum_values from an emitter — the four UPDATEs set widget/ui_config/lookup ONLY.
    for (const e of WIDGET_MIGRATION_ENTRIES) {
      const sql = read(`scripts/migrations/${e.file}.sql`);
      expect(sql, e.file).not.toMatch(/data_type/);
      expect(sql, e.file).not.toMatch(/enum_values/);
      expect((sql.match(/UPDATE fields/g) ?? []).length, e.file).toBe(1);
      expect(sql, e.file).toMatch(/^BEGIN;$/m);
      expect(sql, e.file).toMatch(/^COMMIT;$/m);
      expect(sql, e.file).toContain('AND f.widget IS NULL;');
    }
    const rb = read(ROLLBACK);
    expect(rb).not.toMatch(/data_type/);
    expect(rb).not.toMatch(/enum_values/);
  });

  it('rollback: one guarded NULL-restore per entry, reverse apply order', () => {
    const rb = read(ROLLBACK);
    const stmts = rb.split('\n').filter((l) => l.startsWith('UPDATE fields'));
    expect(stmts).toHaveLength(WIDGET_MIGRATION_ENTRIES.length);
    [...WIDGET_MIGRATION_ENTRIES].reverse().forEach((e, i) => {
      expect(stmts[i]).toContain('SET widget = NULL, ui_config = NULL, lookup = NULL');
      expect(stmts[i]).toContain(`f.symbol = '${e.symbol}' AND s.code = '${e.standard}'`);
      expect(stmts[i]).toContain(`AND f.widget = '${e.widget}';`);
      if (e.template_code) expect(stmts[i]).toContain(`AND w.code = '${e.template_code}'`);
    });
    // ac_as_ratio_limit is scoped to its home template A138-12 (Task 7 coordination); the others are standard-wide.
    expect(WIDGET_MIGRATION_ENTRIES.map((e) => e.template_code ?? null)).toEqual([null, null, null, 'A138-12']);
  });

  it('each TS fallback comment names the migration that retires it (filename sync)', () => {
    const src = (rel: string) => read(rel);
    expect(src('src/lib/eval/register-configs.ts')).toContain('20260916130000_a138_07_surface_inventory_widget.sql');
    expect(src('src/lib/eval/register-configs.ts')).toContain('20260916140000_vsme_b04_pollutant_register_widget.sql');
    expect(src('src/lib/eval/reference-configs.ts')).toContain('20260916150000_a138_rainfall_table_ref_reference.sql');
    expect(src('src/lib/eval/lookup-fill.ts')).toContain('20260916160000_a138_12_ac_as_ratio_limit_lookup_fill.sql');
  });

  it('none of the four symbols is among the Plan-1 selection entries (rollback restore target is NULL)', () => {
    const entries = JSON.parse(read('scripts/regulation-tables/selection-config-entries.json')) as Array<{ symbol: string }>;
    const symbols = new Set(WIDGET_MIGRATION_ENTRIES.map((e) => e.symbol));
    expect(entries.filter((e) => symbols.has(e.symbol))).toEqual([]);
  });
});
