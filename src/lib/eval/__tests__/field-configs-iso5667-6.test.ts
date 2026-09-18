/**
 * Plan 3 Task 23 — ISO-5667-6 field configs: every entry parses through the
 * zod contract, the key-string equality rule (G-A3) holds against the captured
 * prod enums and the seeded tables, no register column is keyed `id` or shadows
 * a prod symbol of its worksheet (amendment P / trap), every driver resolves on
 * its rule's worksheet, visibility never lands on a consumed producer or a
 * gate-read symbol (the refusals that went to STAGED are asserted through the
 * emitter's own guards — not discovered), and the committed migration equals a
 * fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FIELD_CONFIGS, SECTION_VISIBILITY, TRAVEL_TIME, CONTINUOUS, INCREMENTAL, MIXING, VERTICAL, BRIDGE, LEGAL,
  ROW_BRIDGE, ROW_WADING_OR_BANK, ROW_UNDER_ICE, ROW_MIXING, ROW_VERTICAL, DEPTH_OK_EXPR,
  LOCATION_TYPES, HOMOGENEITY_STATUS, MIXING_DIMENSIONS, BRIDGE_POSITIONS, TRAVEL_TIME_METHODS, SAMPLING_MODES_INCREMENT, HETEROGENEITY_DETERMINANTS, ROUGHNESS_OPTIONS, REPORT_ITEMS,
} from '../field-configs/iso5667_6';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { annexAAsTable, s131AsTable } from '../regulation-tables-seed-iso5667_6';
import { Q } from '../regulation-tables-quotes-iso5667_6';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain, gateReaders } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/iso5667_6.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'ISO-5667-6';
const rule = (ws: string, sym: string, visible_when: string) => ({ standard: STD, worksheet: ws, symbol: sym, widget: 'scalar' as const, ui_config: null, visible_when, verification_quote: 'q' });
const prodSymbols = (ws: string) => Object.keys(prior).filter((k) => k.startsWith(`${ws} `)).map((k) => k.slice(ws.length + 1));

describe('ISO-5667-6 field configs (Plan 3 Task 23)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; no section rules; no register column keyed `id` or shadowing a prod symbol of its worksheet', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      if (e.create) expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      if (e.widget === 'register') {
        const syms = prodSymbols(e.worksheet);
        for (const c of (e.ui_config as RegisterUiConfig).columns) {
          expect(c.key, `${e.symbol}.${c.key}`).not.toBe('id');
          expect(syms, `${e.symbol}.${c.key} shadows a prod symbol of ${e.worksheet}`).not.toContain(c.key);
          if (c.expr) expect(parseNumeric(c.expr).ok, `${e.symbol}.${c.key} expr`).toBe(true);
          if (c.visible_when) expect(parseCondition(c.visible_when), `${e.symbol}.${c.key} visible_when`).not.toBeNull();
        }
      }
    }
    expect(SECTION_VISIBILITY).toEqual([]);
  });

  it('counts: 25 field entries (19 create, 6 update), widgets by kind, the visibility list (6 on existing inputs + 12 on created fields)', () => {
    expect(FIELD_CONFIGS).toHaveLength(25);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(19);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual([
      'ISO-5667-6-03 mixing_dimension', 'ISO-5667-6-03 vertical_mixing_distance',
      'ISO-5667-6-04 travel_time_extrapolation_limit',
      'ISO-5667-6-07 bridge_position',
      'ISO-5667-6-08 isokinetic_conditions', 'ISO-5667-6-08 automatic_sampler_mode',
    ]);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['ISO-5667-6-02 sampling_points_6', 'ISO-5667-6-03 heterogeneity_samples', 'ISO-5667-6-04 travel_time_runs', 'ISO-5667-6-09 increments']);
    expect(byWidget('select_many')).toEqual(['ISO-5667-6-11 report_items_6']);
    expect(byWidget('lookup_fill')).toEqual(['ISO-5667-6-13 c_hint']);
    expect(byWidget('select_one')).toEqual(['ISO-5667-6-03 mixing_dimension', 'ISO-5667-6-07 bridge_position', 'ISO-5667-6-08 automatic_sampler_mode', 'ISO-5667-6-13 bed_roughness_hint']);
    expect(byWidget('attestation')).toEqual(['ISO-5667-6-08 isokinetic_conditions', 'ISO-5667-6-09 bottle_contains_preservative']);
    expect(byWidget('scalar')).toEqual(['ISO-5667-6-03 vertical_mixing_distance', 'ISO-5667-6-04 travel_time_extrapolation_limit', 'ISO-5667-6-10 legal_custody_regulations']);
    expect(byWidget('derived')).toEqual([
      'ISO-5667-6-02 sampling_point_count_calc', 'ISO-5667-6-02 points_depth_fail',
      'ISO-5667-6-03 heterogeneity_samples_count_calc', 'ISO-5667-6-03 heterogeneity_samples_ok', 'ISO-5667-6-03 heterogeneity_spread',
      'ISO-5667-6-04 travel_time_flows_count_calc', 'ISO-5667-6-04 travel_time_flows_ok', 'ISO-5667-6-04 travel_time_extrapolation_max',
      'ISO-5667-6-09 increment_total_time_calc', 'ISO-5667-6-09 increment_time_ok',
    ]);
    const vis = FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`);
    expect(vis).toEqual([
      `ISO-5667-6-03 mixing_dimension :: ${MIXING}`, `ISO-5667-6-03 vertical_mixing_distance :: ${VERTICAL}`,
      `ISO-5667-6-04 travel_time_runs :: ${TRAVEL_TIME}`, `ISO-5667-6-04 travel_time_flows_count_calc :: ${TRAVEL_TIME}`, `ISO-5667-6-04 travel_time_flows_ok :: ${TRAVEL_TIME}`, `ISO-5667-6-04 travel_time_extrapolation_max :: ${TRAVEL_TIME}`, `ISO-5667-6-04 travel_time_extrapolation_limit :: ${TRAVEL_TIME}`,
      `ISO-5667-6-07 bridge_position :: ${BRIDGE}`,
      `ISO-5667-6-08 isokinetic_conditions :: ${CONTINUOUS}`, `ISO-5667-6-08 automatic_sampler_mode :: ${CONTINUOUS}`,
      `ISO-5667-6-09 increments :: ${INCREMENTAL}`, `ISO-5667-6-09 increment_total_time_calc :: ${INCREMENTAL}`, `ISO-5667-6-09 increment_time_ok :: ${INCREMENTAL}`,
      `ISO-5667-6-10 legal_custody_regulations :: ${LEGAL}`,
      `ISO-5667-6-13 bed_roughness_hint :: ${MIXING}`, `ISO-5667-6-13 c_hint :: ${MIXING}`,
    ]);
    expect(vis).toHaveLength(16);
    // the -02 register carries the per-point rules in row scope (5 row-scope rules)
    const rowRules = registerCfg('ISO-5667-6-02', 'sampling_points_6').columns.filter((c) => c.visible_when).map((c) => `${c.key} :: ${c.visible_when}`);
    expect(rowRules).toEqual([`bridge_position :: ${ROW_BRIDGE}`, `bridge_checks :: ${ROW_BRIDGE}`, `ppe_high_visibility :: ${ROW_WADING_OR_BANK}`, `ice_safety :: ${ROW_UNDER_ICE}`, `mixing_dimension :: ${ROW_MIXING}`, `vertical_mixing_distance :: ${ROW_VERTICAL}`]);
  });

  it('G-A3 key-string equality: register enum columns / created selects / table keys equal the captured prod enum value strings or the seeded keys exactly; the open determinant list is a datalist', () => {
    expect(enumValues('ISO-5667-6-07 sampling_location_type')).toEqual([...LOCATION_TYPES]);
    expect(enumValues('ISO-5667-6-03 homogeneity_status')).toEqual([...HOMOGENEITY_STATUS]);
    expect(enumValues('ISO-5667-6-03 mixing_dimension')).toEqual([...MIXING_DIMENSIONS]);
    expect(enumValues('ISO-5667-6-07 bridge_position')).toEqual([...BRIDGE_POSITIONS]);
    expect(enumValues('ISO-5667-6-04 travel_time_method')).toEqual([...TRAVEL_TIME_METHODS]);
    expect(enumValues('ISO-5667-6-09 sampling_mode')).toEqual([...SAMPLING_MODES_INCREMENT, 'incremental']);
    expect(enumValues('ISO-5667-6-08 sampling_method')).toEqual(['single_discrete', 'specific_depth', 'continuous']);
    expect(enumValues('ISO-5667-6-05 sampling_strategy')).toEqual(['systematic', 'random']);
    expect(enumValues('ISO-5667-6-03 heterogeneity_determinant')).toHaveLength(11); // prod's closed enum of the eleven printed names; the register column is text + datalist (open list, L939–L940)
    expect(HETEROGENEITY_DETERMINANTS).toHaveLength(11);
    for (const d of HETEROGENEITY_DETERMINANTS) expect(Q.L936_940.replace(/\s+/g, ' '), d).toContain(d);
    expect(Q.L936_940).toContain('Se deberían incluir otros determinantes si son de interés');
    const points = registerCfg('ISO-5667-6-02', 'sampling_points_6').columns;
    const opts = (cols: RegisterUiConfig['columns'], k: string) => cols.find((c) => c.key === k)?.options;
    expect(opts(points, 'location_type')).toEqual(enumValues('ISO-5667-6-07 sampling_location_type'));
    expect(opts(points, 'bridge_position')).toEqual(enumValues('ISO-5667-6-07 bridge_position'));
    expect(opts(points, 'homogeneity_status')).toEqual(enumValues('ISO-5667-6-03 homogeneity_status'));
    expect(opts(points, 'mixing_dimension')).toEqual(enumValues('ISO-5667-6-03 mixing_dimension'));
    expect(opts(registerCfg('ISO-5667-6-04', 'travel_time_runs').columns, 'method')).toEqual(enumValues('ISO-5667-6-04 travel_time_method'));
    expect(opts(registerCfg('ISO-5667-6-09', 'increments').columns, 'mode')).toEqual([...SAMPLING_MODES_INCREMENT]);
    expect(registerCfg('ISO-5667-6-03', 'heterogeneity_samples').columns.find((c) => c.key === 'determinant')?.datalist).toEqual([...HETEROGENEITY_DETERMINANTS]);
    // the created selects drive the seeded tables
    const rough = byKey('ISO-5667-6-13', 'bed_roughness_hint').enum_values as Array<{ value: string }>;
    expect(annexAAsTable().rows.map((r) => r.keys.roughness)).toEqual(rough.map((o) => o.value));
    expect(ROUGHNESS_OPTIONS.map((o) => o.value)).toEqual(['muy_irregular', 'liso']);
    const items = byKey('ISO-5667-6-11', 'report_items_6').enum_values as Array<{ value: string; label_de: string }>;
    expect(s131AsTable().rows.map((r) => r.keys.item)).toEqual(items.map((o) => o.value));
    expect(items.map((o) => o.label_de)).toEqual(s131AsTable().rows.map((r) => r.label_de));
    expect(REPORT_ITEMS).toHaveLength(17);
    expect(enumValues('ISO-5667-6-11 report_item')).toHaveLength(17); // the prod single-value enum stays (D-1)
    // D-1 never writes enum_values on an UPDATE: every UPDATE select is keep_prod
    for (const e of FIELD_CONFIGS.filter((x) => !x.create && (x.widget === 'select_one' || x.widget === 'select_many'))) expect(e.enum_values).toBe('keep_prod');
  });

  it('registers: the -02 discriminator + branch columns, the §7.1 badge reads S7_1, every footer symbol is a created derived output, no override block (no lookup column)', () => {
    const points = registerCfg('ISO-5667-6-02', 'sampling_points_6');
    expect(points.columns.find((c) => c.key === 'location_type')?.discriminator).toBe(true);
    expect(points.columns.find((c) => c.key === 'kennung')?.required).toBe(true);
    expect(points.columns.find((c) => c.key === 'depth_ok')?.expr).toBe(DEPTH_OK_EXPR);
    expect(DEPTH_OK_EXPR).toContain("lookup('S7_1', 'general', 'depth_below_surface_min_cm')");
    expect(DEPTH_OK_EXPR).toContain("lookup('S7_1', 'general', 'height_above_bed_min_cm')");
    expect(DEPTH_OK_EXPR).not.toMatch(/\b30\b/); // the printed 30 cm is read from the table, never typed
    const created = new Set(FIELD_CONFIGS.filter((e) => e.create && e.widget === 'derived').map((e) => `${e.worksheet} ${e.symbol}`));
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'register')) {
      const cfg = e.ui_config as RegisterUiConfig;
      for (const f of cfg.footer ?? []) expect(created.has(`${e.worksheet} ${f}`), `${e.symbol} footer ${f}`).toBe(true);
      expect(cfg.override).toBeUndefined();
    }
    // required columns: a heterogeneity row needs no., flow and value; a travel-time row flow and time; an increment its duration
    const req = (ws: string, sym: string) => registerCfg(ws, sym).columns.filter((c) => c.required).map((c) => c.key);
    expect(req('ISO-5667-6-03', 'heterogeneity_samples')).toEqual(['sample_no', 'flow', 'value']);
    expect(req('ISO-5667-6-04', 'travel_time_runs')).toEqual(['flow', 'travel_time_min']);
    expect(req('ISO-5667-6-09', 'increments')).toEqual(['duration_min']);
  });

  it('lookup_fill: c_hint ← ANNEXA by the created bed_roughness_hint (same worksheet), role value, number; c itself stays the typed input (SR-2: 15 < c < 50)', () => {
    const e = byKey('ISO-5667-6-13', 'c_hint');
    expect(e.lookup).toEqual({ table_code: 'ANNEXA', role: 'value', keys: [{ column: 'roughness', from_symbol: 'bed_roughness_hint' }], value: 'c_example' });
    expect(e.lookup!.keys.map((k) => k.column)).toEqual(annexAAsTable().key_columns);
    expect(e.create?.data_type).toBe('number');
    expect(byKey('ISO-5667-6-13', 'bed_roughness_hint').create?.data_type).toBe('enum');
    expect(FIELD_CONFIGS.find((x) => x.symbol === 'c')).toBeUndefined();
    expect(FIELD_CONFIGS.find((x) => x.symbol === 'g')).toBeUndefined();
    expect(FIELD_CONFIGS.find((x) => x.symbol === 'l')).toBeUndefined();
    expect(priorRow('ISO-5667-6-13 c').data_type).toBe('number');
    expect(e.verification_quote).toContain('15 < c < 50');
  });

  it('drivers resolve on their rule\'s worksheet: mixing_relevant (-03) is inherited on -13; the other drivers live on the rule\'s own worksheet; the -02 register carries its own location_type / mixing columns', () => {
    expect(priorRow('ISO-5667-6-03 mixing_relevant').consumer_worksheets).toEqual(['ISO-5667-6-13']);
    expect(priorRow('ISO-5667-6-03 mixing_relevant').data_type).toBe('boolean');
    expect(priorRow('ISO-5667-6-04 travel_time_required').consumer_worksheets).toBeNull();
    expect(priorRow('ISO-5667-6-04 travel_time_required').data_type).toBe('boolean');
    expect(priorRow('ISO-5667-6-07 sampling_location_type').consumer_worksheets).toEqual(['ISO-5667-6-09']); // driver on -07 itself; NOT on -02 (the register carries its own column)
    expect(priorRow('ISO-5667-6-08 sampling_method').consumer_worksheets).toEqual(['ISO-5667-6-09']);
    expect(priorRow('ISO-5667-6-09 sampling_mode').consumer_worksheets).toBeNull();
    expect(priorRow('ISO-5667-6-10 legal_purpose_sample').data_type).toBe('boolean');
    expect(priorRow('ISO-5667-6-10 legal_purpose_sample').consumer_worksheets).toBeNull();
    // O-1: the brief's chain_of_custody_* / bottle_contains_preservative / extrapolation_pct targets do not exist in the capture
    expect(Object.keys(prior).filter((k) => k.includes('chain_of_custody'))).toEqual([]);
    expect(priorRow('ISO-5667-6-09 bottle_contains_preservative')).toBeUndefined();
    expect(priorRow('ISO-5667-6-04 extrapolation_pct')).toBeUndefined();
    expect(priorRow('ISO-5667-6-04 travel_time_extrapolation_limit').data_type).toBe('number');
  });

  it('visibility never lands on a consumed producer or a gate-read symbol: every emitted UPDATE target is consumer-free with no same-worksheet gate reader; the brief\'s refused targets are asserted through the guards (G-1 / G-3 / G-4 / G-5 / G-6 / C-1)', () => {
    for (const e of FIELD_CONFIGS.filter((x) => x.visible_when && !x.create)) {
      const row = priorRow(`${e.worksheet} ${e.symbol}`);
      expect(row, `${e.worksheet} ${e.symbol} captured`).toBeDefined();
      expect(row.consumer_worksheets ?? [], `${e.symbol} consumers`).toEqual([]);
      expect(gateReaders(prior, e.worksheet, e.symbol, e.visible_when!).map((g) => g.code), `${e.symbol} gate readers`).toEqual([]);
      expect(producerChain(prior, e.worksheet, e.symbol)).toBeNull();
    }
    // G-1: inlet_velocity ← CR-017 (unguarded warn)
    expect(gateReaders(prior, 'ISO-5667-6-08', 'inlet_velocity', CONTINUOUS).map((g) => g.code)).toEqual(['CR-017']);
    expect(() => emitFieldConfigSql('iso5667_6', [rule('ISO-5667-6-08', 'inlet_velocity', CONTINUOUS)], [], prior)).toThrow(/read by gate CR-017/);
    // G-3: travel_time_method / travel_time_flows_count ← CR-009 (the OR form is not an IF guard)
    for (const s of ['travel_time_method', 'travel_time_flows_count']) {
      expect(gateReaders(prior, 'ISO-5667-6-04', s, TRAVEL_TIME).map((g) => g.code), s).toEqual(['CR-009']);
      expect(() => emitFieldConfigSql('iso5667_6', [rule('ISO-5667-6-04', s, TRAVEL_TIME)], [], prior)).toThrow(/CR-009/);
    }
    // G-4: cycle_coincidence_avoided ← CR-011 (block, `sampling_strategy != 'systematic' OR …` — semantically the guard, syntactically not)
    expect(gateReaders(prior, 'ISO-5667-6-05', 'cycle_coincidence_avoided', "sampling_strategy == 'systematic'").map((g) => g.code)).toEqual(['CR-011']);
    expect(() => emitFieldConfigSql('iso5667_6', [rule('ISO-5667-6-05', 'cycle_coincidence_avoided', "sampling_strategy == 'systematic'")], [], prior)).toThrow(/CR-011/);
    // G-5: increment_total_time ← CR-021
    expect(gateReaders(prior, 'ISO-5667-6-09', 'increment_total_time', INCREMENTAL).map((g) => g.code)).toEqual(['CR-021']);
    expect(() => emitFieldConfigSql('iso5667_6', [rule('ISO-5667-6-09', 'increment_total_time', INCREMENTAL)], [], prior)).toThrow(/CR-021/);
    // G-6: bridge_checks_passed ← CR-015 (block)
    expect(gateReaders(prior, 'ISO-5667-6-07', 'bridge_checks_passed', BRIDGE).map((g) => g.code)).toEqual(['CR-015']);
    expect(() => emitFieldConfigSql('iso5667_6', [rule('ISO-5667-6-07', 'bridge_checks_passed', BRIDGE)], [], prior)).toThrow(/CR-015/);
    // the IF-guard exemption would rescue the G-6 hide once CR-015 reads `IF sampling_location_type == 'bridge' THEN bridge_checks_passed == true`
    const guarded: PriorSnapshot = { ...prior, gates: { ...prior.gates, 'ISO-5667-6-07 CR-015': { ...prior.gates!['ISO-5667-6-07 CR-015'], condition: `IF ${BRIDGE} THEN bridge_checks_passed == true` } } };
    expect(gateReaders(guarded, 'ISO-5667-6-07', 'bridge_checks_passed', BRIDGE)).toEqual([]);
    // C-1: the -13 section rules hide the inputs of Eq. A.1 whose output l is consumed by -03 (transitive producer guard)
    for (const s of ['b', 'c', 'g', 'd']) expect(producerChain(prior, 'ISO-5667-6-13', s), s).toMatch(/→ Gl\.A\.1 l|A\.1 l/);
    expect(priorRow('ISO-5667-6-13 l').consumer_worksheets).toEqual(['ISO-5667-6-03']);
    expect(() => emitFieldConfigSql('iso5667_6', [], [{ standard: STD, worksheet: 'ISO-5667-6-13', section_code: 'B', visible_when: MIXING, verification_quote: 'q' }], prior)).toThrow(/consumed by another worksheet/);
    expect(() => emitFieldConfigSql('iso5667_6', [], [{ standard: STD, worksheet: 'ISO-5667-6-13', section_code: 'C', visible_when: MIXING, verification_quote: 'q' }], prior)).toThrow(/consumed by another worksheet/);
    // the two EMPTY-condition gates (CR-007 on -03, CR-028 on -11) never refuse (round-2 rule) — the emitted -03 rules pass beside CR-007
    expect(prior.gates!['ISO-5667-6-03 CR-007'].condition).toBe('');
    expect(prior.gates!['ISO-5667-6-11 CR-028'].condition).toBe('');
    expect(gateReaders(prior, 'ISO-5667-6-03', 'mixing_dimension', MIXING)).toEqual([]);
    // the two captured equations
    expect(Object.keys(prior.equations!)).toEqual(['ISO-5667-6-07 2', 'ISO-5667-6-13 A.1']);
    // no self-consumer entries in this capture (Task 12b NOTICE would otherwise print)
    for (const [k, r] of Object.entries(prior)) {
      if (!k.includes(' ') || ['sections', 'equations', 'gates', '_meta'].includes(k)) continue;
      const ws = k.split(' ')[0];
      expect((r as Row).consumer_worksheets ?? [], k).not.toContain(ws);
    }
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) {
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
    }
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin, default refuse mode, no warnings)', () => {
    const { up, down, warnings } = emitFieldConfigSql('iso5667_6', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('iso5667_6', '20260917102310');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(6);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(19);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
  });
});
