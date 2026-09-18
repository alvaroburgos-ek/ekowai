/**
 * Plan 3 Task 20 — ISO-5667-10 field configs: every entry parses through the
 * zod contract, the key-string equality rule (G-A3) holds against the captured
 * prod enums and the seeded tables, every driver resolves on its rule's
 * worksheet (or is pinned `pending`), visibility never lands on a consumed
 * producer or a gate-read symbol (the refusals that went to STAGED are asserted
 * through the emitter's own guards — not discovered), the amendment-K pairs are
 * counted, and the committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FIELD_CONFIGS, SECTION_VISIBILITY, QUALIFIED, YEAR, GRAB, COMPOSITE, FLOW_PROPORTIONAL, CTCV, IN_STORAGE, SEWER, WWTP, COOLING, EVENT,
  DAY_OR_WEEK_EXPR, V_N_EXPR, UNIT_VOLUME_MIN_EXPR, SITE_TYPES, PUMP_TECHNOLOGIES,
} from '../field-configs/iso5667_10';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { s432AsTable, s721AsTable, s7221PumpAsTable, s34AsTable, s91AsTable, s5SiteAsTable } from '../regulation-tables-seed-iso5667_10';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain, gateReaders } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/iso5667_10.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'ISO-5667-10';
const rule = (ws: string, sym: string, visible_when: string) => ({ standard: STD, worksheet: ws, symbol: sym, widget: 'scalar' as const, ui_config: null, visible_when, verification_quote: 'q' });

describe('ISO-5667-10 field configs (Plan 3 Task 20)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; no section rules', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      if (e.create) expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      if (e.widget === 'register') {
        for (const c of (e.ui_config as RegisterUiConfig).columns) {
          if (c.expr) expect(parseNumeric(c.expr).ok, `${e.symbol}.${c.key} expr`).toBe(true);
          if (c.visible_when) expect(parseCondition(c.visible_when), `${e.symbol}.${c.key} visible_when`).not.toBeNull();
        }
      }
    }
    expect(SECTION_VISIBILITY).toEqual([]);
  });

  it('counts: 37 field entries (27 create, 10 update), widgets by kind, the visibility list (12 on existing / created inputs + the register / output rules)', () => {
    expect(FIELD_CONFIGS).toHaveLength(37);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(27);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual([
      'ISO-5667-10-04 sampling_depth_fraction', 'ISO-5667-10-04 wwtp_sampling_objective', 'ISO-5667-10-04 bypass_flow_assessed', 'ISO-5667-10-04 cooling_system_type', 'ISO-5667-10-04 upstream_of_biocide',
      'ISO-5667-10-05 grab_method',
      'ISO-5667-10-06 sampler_flow_linked', 'ISO-5667-10-06 tank_mixing_maintained',
      'ISO-5667-10-07 tank_mixing_system', 'ISO-5667-10-07 tank_sampling_device',
    ]);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['ISO-5667-10-01 stichproben_qualifiziert', 'ISO-5667-10-02 probenahmestellen', 'ISO-5667-10-03 probenahmetermine', 'ISO-5667-10-06 flaschen_ctcv', 'ISO-5667-10-07 probenahmegeraete']);
    expect(byWidget('lookup_fill')).toEqual(['ISO-5667-10-06 composite_interval_max']);
    expect(byWidget('select_one')).toEqual(['ISO-5667-10-04 wwtp_sampling_objective', 'ISO-5667-10-04 cooling_system_type', 'ISO-5667-10-05 grab_method', 'ISO-5667-10-06 composite_duration_band', 'ISO-5667-10-07 tank_mixing_system', 'ISO-5667-10-07 tank_sampling_device']);
    expect(byWidget('select_many')).toEqual([]);
    expect(byWidget('attestation')).toEqual(['ISO-5667-10-04 bypass_flow_assessed', 'ISO-5667-10-04 upstream_of_biocide', 'ISO-5667-10-06 sampler_flow_linked', 'ISO-5667-10-06 tank_mixing_maintained']);
    expect(byWidget('scalar')).toEqual(['ISO-5667-10-04 sampling_depth_fraction', 'ISO-5667-10-05 flow_cv_pct', 'ISO-5667-10-06 event_trigger_criterion']);
    expect(byWidget('derived')).toEqual([
      'ISO-5667-10-01 qualified_grab_count_calc', 'ISO-5667-10-01 qualified_grab_count_ok',
      'ISO-5667-10-02 stellen_count', 'ISO-5667-10-02 stellen_site_fail',
      'ISO-5667-10-03 period_length_calc', 'ISO-5667-10-03 A_min_calc', 'ISO-5667-10-03 A_in_range', 'ISO-5667-10-03 termine_count', 'ISO-5667-10-03 termine_done',
      'ISO-5667-10-05 ctcv_cv_max', 'ISO-5667-10-05 ctcv_applicable',
      'ISO-5667-10-06 suction_velocity_min', 'ISO-5667-10-06 v_n_sum', 'ISO-5667-10-06 m3_n_sum', 'ISO-5667-10-06 flaschen_count',
      'ISO-5667-10-07 geraete_count', 'ISO-5667-10-07 geraete_unit_volume_fail',
      'ISO-5667-10-08 homogenizer_mechanical_required',
    ]);
    const vis = FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`);
    expect(vis).toEqual([
      `ISO-5667-10-01 stichproben_qualifiziert :: ${QUALIFIED}`, `ISO-5667-10-01 qualified_grab_count_calc :: ${QUALIFIED}`, `ISO-5667-10-01 qualified_grab_count_ok :: ${QUALIFIED}`,
      `ISO-5667-10-03 probenahmetermine :: ${YEAR}`, `ISO-5667-10-03 period_length_calc :: ${YEAR}`, `ISO-5667-10-03 A_min_calc :: ${YEAR}`, `ISO-5667-10-03 A_in_range :: ${YEAR}`, `ISO-5667-10-03 termine_count :: ${YEAR}`, `ISO-5667-10-03 termine_done :: ${YEAR}`,
      `ISO-5667-10-04 sampling_depth_fraction :: ${SEWER}`, `ISO-5667-10-04 wwtp_sampling_objective :: ${WWTP}`, `ISO-5667-10-04 bypass_flow_assessed :: ${WWTP}`, `ISO-5667-10-04 cooling_system_type :: ${COOLING}`, `ISO-5667-10-04 upstream_of_biocide :: ${COOLING}`,
      `ISO-5667-10-05 grab_method :: ${GRAB}`, `ISO-5667-10-05 flow_cv_pct :: ${CTCV}`, `ISO-5667-10-05 ctcv_cv_max :: ${CTCV}`, `ISO-5667-10-05 ctcv_applicable :: ${CTCV}`,
      `ISO-5667-10-06 composite_duration_band :: ${COMPOSITE}`, `ISO-5667-10-06 composite_interval_max :: ${COMPOSITE}`,
      `ISO-5667-10-06 flaschen_ctcv :: ${CTCV}`, `ISO-5667-10-06 v_n_sum :: ${CTCV}`, `ISO-5667-10-06 m3_n_sum :: ${CTCV}`, `ISO-5667-10-06 flaschen_count :: ${CTCV}`,
      `ISO-5667-10-06 sampler_flow_linked :: ${FLOW_PROPORTIONAL}`, `ISO-5667-10-06 event_trigger_criterion :: ${EVENT}`, `ISO-5667-10-06 tank_mixing_maintained :: ${IN_STORAGE}`,
      `ISO-5667-10-07 tank_mixing_system :: ${IN_STORAGE}`, `ISO-5667-10-07 tank_sampling_device :: ${IN_STORAGE}`,
    ]);
    expect(vis).toHaveLength(29);
  });

  it('G-A3 key-string equality: table keys and register enum options equal the captured prod enum value strings / the created select exactly', () => {
    expect(enumValues('ISO-5667-10-01 sample_type_definition')).toEqual(['composite', 'grab', 'qualified_grab']);
    expect(s34AsTable().rows.map((r) => r.keys.definicion)).toEqual(['qualified_grab']);
    expect(enumValues('ISO-5667-10-03 sampling_period')).toEqual(['year', 'several_months', 'weeks', 'shorter']);
    expect(enumValues('ISO-5667-10-04 specific_site_type')).toEqual([...SITE_TYPES]);
    expect(s5SiteAsTable().rows.map((r) => r.keys.site).every((k) => (SITE_TYPES as readonly string[]).includes(k))).toBe(true);
    expect(enumValues('ISO-5667-10-05 main_sampling_type')).toEqual(['grab', 'composite']);
    expect(enumValues('ISO-5667-10-05 composite_mode')).toEqual(['CVVT', 'CTVV', 'CTCV', 'manual']);
    expect(enumValues('ISO-5667-10-02 representativeness_mode')).toEqual(['in_flow', 'in_storage']);
    expect(enumValues('ISO-5667-10-07 pump_technology')).toEqual([...PUMP_TECHNOLOGIES]);
    expect(s7221PumpAsTable().rows.map((r) => r.keys.pump).every((k) => (PUMP_TECHNOLOGIES as readonly string[]).includes(k))).toBe(true);
    expect(enumValues('ISO-5667-10-08 homogenizer_type')).toEqual(['mechanical', 'laboratory_manual']);
    expect(s91AsTable().rows.map((r) => r.values.homogenizer)).toEqual(['mechanical', 'laboratory_manual']);
    // the created select composite_duration_band drives S7_2_1
    const band = byKey('ISO-5667-10-06', 'composite_duration_band').enum_values as Array<{ value: string }>;
    expect(s721AsTable().rows.map((r) => r.keys.duration)).toEqual(band.map((o) => o.value));
    // S4_3_2 keys are the two tokens the equations / row expr choose between
    expect(s432AsTable().rows.map((r) => r.keys.n_band)).toEqual(['gt25', 'lt25']);
    expect(DAY_OR_WEEK_EXPR).toContain("'gt25', 'lt25'");
    // the -02 register's enum columns carry the prod tokens of the scalars they twin (amendment K pairs)
    const cols = registerCfg('ISO-5667-10-02', 'probenahmestellen').columns;
    const opts = (k: string) => cols.find((c) => c.key === k)?.options;
    expect(opts('flow_type')).toEqual(enumValues('ISO-5667-10-02 flow_type'));
    expect(opts('specific_site_type')).toEqual(enumValues('ISO-5667-10-04 specific_site_type'));
    expect(opts('wwtp_objective')).toEqual(enumValues('ISO-5667-10-04 wwtp_sampling_objective'));
    expect(opts('cooling_type')).toEqual(enumValues('ISO-5667-10-04 cooling_system_type'));
    const gcols = registerCfg('ISO-5667-10-07', 'probenahmegeraete').columns;
    expect(gcols.find((c) => c.key === 'mobility')?.options).toEqual(enumValues('ISO-5667-10-07 sampler_mobility'));
    expect(gcols.find((c) => c.key === 'pump_technology')?.options).toEqual(enumValues('ISO-5667-10-07 pump_technology'));
    expect(gcols.find((c) => c.key === 'unit_volume_min')?.expr).toBe(UNIT_VOLUME_MIN_EXPR);
    // D-1 never writes enum_values on an UPDATE: every UPDATE select is keep_prod
    for (const e of FIELD_CONFIGS.filter((x) => !x.create && (x.widget === 'select_one' || x.widget === 'select_many'))) expect(e.enum_values).toBe('keep_prod');
  });

  it('registers: the schedule and bottle rows read the worksheet scalars (G-13) — A / number_of_samples on -03, V_final / M3_total on -06 — and every footer symbol is a created derived output', () => {
    const termine = registerCfg('ISO-5667-10-03', 'probenahmetermine');
    expect(termine.columns.find((c) => c.key === 'day_or_week')?.expr).toBe(DAY_OR_WEEK_EXPR);
    for (const s of ['A', 'number_of_samples', 'k', 'sampling_day_k', 'sampling_week_k']) expect(priorRow(`ISO-5667-10-03 ${s}`), s).toBeDefined();
    const bottles = registerCfg('ISO-5667-10-06', 'flaschen_ctcv');
    expect(bottles.columns.find((c) => c.key === 'v_n')?.expr).toBe(V_N_EXPR);
    for (const s of ['V_final', 'M3_total', 'M3_n', 'V_n']) expect(priorRow(`ISO-5667-10-06 ${s}`), s).toBeDefined();
    const created = new Set(FIELD_CONFIGS.filter((e) => e.create && e.widget === 'derived').map((e) => `${e.worksheet} ${e.symbol}`));
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'register')) {
      const cfg = e.ui_config as RegisterUiConfig;
      for (const f of cfg.footer ?? []) expect(created.has(`${e.worksheet} ${f}`), `${e.symbol} footer ${f}`).toBe(true);
      expect(cfg.override).toBeUndefined(); // no lookup_key column anywhere → no override block
    }
    // discriminator columns: the -02 site type and the -07 pump technology; the branch columns carry row-scope rules on the prod tokens
    const cols = registerCfg('ISO-5667-10-02', 'probenahmestellen').columns;
    expect(cols.find((c) => c.key === 'specific_site_type')?.discriminator).toBe(true);
    const vis = (k: string) => cols.find((c) => c.key === k)?.visible_when;
    for (const k of ['restriction_downstream_diameters', 'sampling_depth_fraction']) expect(vis(k), k).toBe(SEWER);
    for (const k of ['wwtp_objective', 'bypass_assessed']) expect(vis(k), k).toBe(WWTP);
    for (const k of ['cooling_type', 'cooling_runoff_s', 'upstream_of_biocide']) expect(vis(k), k).toBe(COOLING);
    for (const k of ['id', 'location', 'flow_type', 'well_mixed']) expect(vis(k), k).toBeUndefined();
    expect(registerCfg('ISO-5667-10-07', 'probenahmegeraete').columns.find((c) => c.key === 'pump_technology')?.discriminator).toBe(true);
  });

  it('lookup_fill: composite_interval_max ← S7_2_1 by the created composite_duration_band (same worksheet), role limit, number', () => {
    const e = byKey('ISO-5667-10-06', 'composite_interval_max');
    expect(e.lookup).toEqual({ table_code: 'S7_2_1', role: 'limit', keys: [{ column: 'duration', from_symbol: 'composite_duration_band' }], value: 'max_interval_min' });
    expect(e.lookup!.keys.map((k) => k.column)).toEqual(s721AsTable().key_columns);
    expect(e.create?.data_type).toBe('number');
    expect(byKey('ISO-5667-10-06', 'composite_duration_band').create?.data_type).toBe('enum');
    // the existing composite_interval (CR-016) keeps its input — the comparison is STAGED (G-3)
    expect(FIELD_CONFIGS.find((x) => x.symbol === 'composite_interval')).toBeUndefined();
    expect(priorRow('ISO-5667-10-06 composite_interval').data_type).toBe('number');
  });

  it('drivers resolve on their rule\'s worksheet — or are pinned pending: representativeness_mode is not inherited on -07 (iso5667_10-C-1)', () => {
    expect(priorRow('ISO-5667-10-01 sample_type_definition').consumer_worksheets).toEqual(['ISO-5667-10-05']); // driver on -01 itself
    expect(priorRow('ISO-5667-10-03 sampling_period').consumer_worksheets).toBeNull();                      // driver on -03 itself
    expect(priorRow('ISO-5667-10-04 specific_site_type').consumer_worksheets).toEqual(['ISO-5667-10-06']);   // driver on -04 itself; NOT on -02 (the register carries its own column)
    expect(priorRow('ISO-5667-10-05 main_sampling_type').consumer_worksheets).toEqual(['ISO-5667-10-06', 'ISO-5667-10-07']);
    expect(priorRow('ISO-5667-10-05 composite_mode').consumer_worksheets).toEqual(['ISO-5667-10-06']);
    expect(priorRow('ISO-5667-10-02 representativeness_mode').consumer_worksheets).toEqual(['ISO-5667-10-04', 'ISO-5667-10-06']); // -07 missing → the two -07 tank rules are pending until C-1
    expect(priorRow('ISO-5667-10-06 event_triggered_sampling').data_type).toBe('boolean');
  });

  it('visibility never lands on a consumed producer or a gate-read symbol: every emitted UPDATE target is consumer-free with no same-worksheet gate reader; the brief\'s refused targets are asserted through the guards (G-1 … G-9 / C-2)', () => {
    for (const e of FIELD_CONFIGS.filter((x) => x.visible_when && !x.create)) {
      const row = priorRow(`${e.worksheet} ${e.symbol}`);
      expect(row, `${e.worksheet} ${e.symbol} captured`).toBeDefined();
      expect(row.consumer_worksheets ?? [], `${e.symbol} consumers`).toEqual([]);
      expect(gateReaders(prior, e.worksheet, e.symbol, e.visible_when!).map((g) => g.code), `${e.symbol} gate readers`).toEqual([]);
      expect(producerChain(prior, e.worksheet, e.symbol)).toBeNull();
    }
    // refused: composite_interval ← CR-016 (unguarded block); V_n ← CR-019; V_final / M3_total / M3_n → equation 3 V_n ← CR-019 (chain)
    expect(gateReaders(prior, 'ISO-5667-10-06', 'composite_interval', COMPOSITE).map((g) => g.code)).toEqual(['CR-016']);
    expect(gateReaders(prior, 'ISO-5667-10-06', 'V_n', CTCV).map((g) => g.code)).toEqual(['CR-019']);
    for (const s of ['V_final', 'M3_total', 'M3_n']) {
      const r = gateReaders(prior, 'ISO-5667-10-06', s, CTCV);
      expect(r.map((g) => g.code), s).toEqual(['CR-019']);
      expect(r[0].chain, s).toMatch(/→ Gl\.3 V_n/);
      expect(() => emitFieldConfigSql('iso5667_10', [rule('ISO-5667-10-06', s, CTCV)], [], prior)).toThrow(/read by gate CR-019/);
    }
    // refused: tube / velocity / unit volume under the automatic modes ← CR-017 / CR-018
    expect(gateReaders(prior, 'ISO-5667-10-06', 'tube_internal_diameter', COMPOSITE).map((g) => g.code)).toEqual(['CR-017']);
    expect(gateReaders(prior, 'ISO-5667-10-06', 'unit_volume', COMPOSITE).map((g) => g.code)).toEqual(['CR-018']);
    // refused: the -04 site figures ← CR-011 / CR-012 (G-6)
    expect(gateReaders(prior, 'ISO-5667-10-04', 'restriction_downstream_diameters', SEWER).map((g) => g.code)).toEqual(['CR-011']);
    expect(gateReaders(prior, 'ISO-5667-10-04', 'cooling_runoff_time', COOLING).map((g) => g.code)).toEqual(['CR-012']);
    expect(() => emitFieldConfigSql('iso5667_10', [rule('ISO-5667-10-04', 'cooling_runoff_time', COOLING)], [], prior)).toThrow(/CR-012/);
    // refused: the -01 qualified-grab scalars ← CR-002 (G-8)
    for (const s of ['qualified_grab_count', 'qualified_grab_window', 'qualified_grab_interval']) expect(gateReaders(prior, 'ISO-5667-10-01', s, QUALIFIED).map((g) => g.code), s).toEqual(['CR-002']);
    // refused: A / k → equations 1 / 2 → sampling_day_k / sampling_week_k ← CR-008 (G-9); number_of_samples consumed by -05 / -06 AND ← CR-007
    for (const s of ['A', 'k']) {
      const r = gateReaders(prior, 'ISO-5667-10-03', s, YEAR);
      expect(r.map((g) => g.code), s).toEqual(['CR-008']);
      expect(r[0].chain, s).toMatch(/→ Gl\.1 sampling_day_k/);
    }
    expect(gateReaders(prior, 'ISO-5667-10-03', 'sampling_day_k', YEAR).map((g) => g.code)).toEqual(['CR-008']);
    expect(priorRow('ISO-5667-10-03 number_of_samples').consumer_worksheets).toEqual(['ISO-5667-10-05', 'ISO-5667-10-06']);
    expect(() => emitFieldConfigSql('iso5667_10', [rule('ISO-5667-10-03', 'number_of_samples', YEAR)], [], prior)).toThrow(/consumed/);
    // refused: homogeneity_deviation — consumed by -08 AND read by CR-021 (G-1 / J-3); composite_mode — consumed by -06 (C-2)
    expect(priorRow('ISO-5667-10-06 homogeneity_deviation').consumer_worksheets).toEqual(['ISO-5667-10-08']);
    expect(gateReaders(prior, 'ISO-5667-10-06', 'homogeneity_deviation', IN_STORAGE).map((g) => g.code)).toEqual(['CR-021']);
    expect(() => emitFieldConfigSql('iso5667_10', [rule('ISO-5667-10-05', 'composite_mode', COMPOSITE)], [], prior)).toThrow(/consumed/);
    // the IF-guard exemption would rescue the G-6 hides once CR-011 / CR-012 carry `IF specific_site_type == '…' THEN …` (pinned as the mechanism G-6 relies on)
    const guarded: PriorSnapshot = { ...prior, gates: { ...prior.gates, 'ISO-5667-10-04 CR-011': { ...prior.gates!['ISO-5667-10-04 CR-011'], condition: `IF ${SEWER} THEN restriction_downstream_diameters >= 3` } } };
    expect(gateReaders(guarded, 'ISO-5667-10-04', 'restriction_downstream_diameters', SEWER)).toEqual([]);
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
    const { up, down, warnings } = emitFieldConfigSql('iso5667_10', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('iso5667_10', '20260917102010');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(10);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(27);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
  });
});
