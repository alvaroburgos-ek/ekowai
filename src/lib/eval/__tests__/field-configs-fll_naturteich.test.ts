/**
 * Plan 3 Task 8 — FLL-Naturteich field configs: every entry parses through the zod
 * contract, the key-string equality rule (G-A3) holds against the captured prod
 * enums and the seeded tables, the emitter accepts the module against the
 * captured prior, visibility never lands on a consumed producer (directly or
 * through a same-worksheet equation chain), the withheld rules are refused for
 * the reasons the sign-off blocks give, and the committed migration equals a
 * fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FIELD_CONFIGS, SECTION_VISIBILITY, REGENERATION_TECHNIQUE_TOKENS, TYPES_I_III, TYPES_III_IV, NOT_HORIZONTAL, EMERSED, SUBSTRATE_ROLE_LABELS,
} from '../field-configs/fll_naturteich';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import {
  table1AsTable, table8PAsTable, table9AsTable, table10AsTable, table11AsTable, table12AsTable, table15AsTable, s1043AsTable, table2SubmergedAsTable,
  POOL_TYPE_TOKENS, HYDROBOT_TYPE_TOKENS, FLOW_DIRECTION_TOKENS, FLOW_TYPE_TOKENS, SUBSTRATE_ROLE_TOKENS, GRAIN_CLASS_TOKENS, PLANT_GROUP_TOKENS,
} from '../regulation-tables-seed-fll_naturteich';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/fll_naturteich.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const col = (ws: string, sym: string, key: string) => registerCfg(ws, sym).columns.find((c) => c.key === key)!;
const cons = (k: string) => priorRow(k).consumer_worksheets ?? [];

describe('FLL-Naturteich field configs (Plan 3 Task 8)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      if (e.create) expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      if (e.widget === 'register') {
        for (const c of (e.ui_config as RegisterUiConfig).columns) {
          if (c.expr) expect(parseNumeric(c.expr).ok, `${e.symbol}.${c.key} expr`).toBe(true);
          if (c.visible_when) expect(parseCondition(c.visible_when), `${e.symbol}.${c.key} visible_when`).not.toBeNull();
        }
      }
    }
    for (const s of SECTION_VISIBILITY) expect(parseCondition(s.visible_when), `${s.worksheet} ${s.section_code}`).not.toBeNull();
  });

  it('counts: 37 field entries (34 create, 3 update), widgets by kind, 4 field rules, 0 section rules (the type-driven hide of -09 / -10 is STAGED as C-3)', () => {
    expect(FIELD_CONFIGS).toHaveLength(37);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(34);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual(['FLLNT-10 filter_water_column', 'FLLNT-10 filter_kf', 'FLLNT-12 plant_species_list']);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['FLLNT-04 wasserproben', 'FLLNT-06 zonen', 'FLLNT-10 filtereinheiten', 'FLLNT-11 ueberlaufeinrichtungen', 'FLLNT-12 plant_species_list']);
    expect(byWidget('select_one')).toEqual(['FLLNT-05 substrate_role']);
    expect(byWidget('select_many')).toEqual([]);
    expect(byWidget('lookup_fill')).toEqual([
      'FLLNT-03 regeneration_share_min_pct', 'FLLNT-03 regeneration_share_tab1_text', 'FLLNT-03 flow_tab1_text', 'FLLNT-03 filter_operation_tab1_text',
      'FLLNT-04 swimming_p_total_limit', 'FLLNT-04 swimming_orthophosphate_limit',
      'FLLNT-05 grain_size_max_tab9', 'FLLNT-05 oversize_max_tab9', 'FLLNT-05 fines_max_tab9', 'FLLNT-05 kf_min_tab9', 'FLLNT-05 frost_resistance_tab9', 'FLLNT-05 elutable_p_max_tab9',
      'FLLNT-09 hydrobot_water_column_min_tab10', 'FLLNT-09 hydrobot_water_column_max_tab10', 'FLLNT-09 hydrobot_substrate_min_tab10', 'FLLNT-09 hydrobot_substrate_max_tab10', 'FLLNT-09 hydrobot_grain_max_tab10', 'FLLNT-09 hydrobot_feed_qmax_tab10',
    ]);
    expect(byWidget('derived')).toEqual([
      'FLLNT-04 sample_count', 'FLLNT-04 sample_violations', 'FLLNT-06 total_pool_area_calc', 'FLLNT-06 regeneration_share_calc', 'FLLNT-06 pool_underwater_surface_calc', 'FLLNT-06 submerged_hydrobot_share_calc',
      'FLLNT-10 filter_colonized_surface_total', 'FLLNT-10 filter_feed_violations', 'FLLNT-11 overflow_edge_length_total', 'FLLNT-11 overflow_tolerance_violations', 'FLLNT-12 plant_count_total',
    ]);
    expect(byWidget('scalar')).toEqual(['FLLNT-10 filter_water_column', 'FLLNT-10 filter_kf']);
    const rules = FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`);
    expect(rules).toEqual([
      `FLLNT-03 regeneration_share_min_pct :: ${TYPES_I_III}`,
      `FLLNT-09 hydrobot_water_column_max_tab10 :: ${EMERSED}`,
      `FLLNT-10 filter_water_column :: ${NOT_HORIZONTAL}`,
      `FLLNT-10 filter_kf :: ${NOT_HORIZONTAL}`,
    ]);
    expect(SECTION_VISIBILITY).toEqual([]); // fix round 1: the driver-free sections A / F / J / K / L / M hold 0 fields (capture) — a rule there is not observable; C-3 carries all nine sections per worksheet
    for (const code of ['A', 'F', 'J', 'K', 'L', 'M']) expect(Object.keys(prior).filter((k) => k.startsWith('FLLNT-09 ') && priorRow(k).section_code === code)).toEqual([]);
    for (const code of ['A', 'J', 'K', 'L', 'M']) expect(Object.keys(prior).filter((k) => k.startsWith('FLLNT-10 ') && priorRow(k).section_code === code)).toEqual([]);
    expect(TYPES_III_IV).toBe("natural_pool_type IN {'type_III', 'type_IV'}"); // the C-3 rule for -10 (STAGED)
    // never touched: the consumed producers of the brief's Step 4 (C-2), the orphan enum-leak fields (S-1), the existing measured inputs (E-1)
    for (const sym of ['p_binding_required', 'splash_water_tank_volume', 'type_III', 'submergent', 'emersed', 'vertical_continuous_overflow', 'vertical_no_overflow', 'filter_substrate_elutable_p', 'filter_substrate_elutriated_pct', 'filter_substrate_oversize_pct', 'filter_grain_size_max', 'hydrobot_water_column', 'hydrobot_feed_rate', 'grain_specific_surface', 'F_filter', 'h_filter', 'equipment_elements_list']) {
      expect(FIELD_CONFIGS.find((e) => e.symbol === sym), sym).toBeUndefined();
    }
  });

  it('G-A3 key-string equality: table keys and register enum options equal the captured prod enum value strings exactly', () => {
    expect([...POOL_TYPE_TOKENS]).toEqual(enumValues('FLLNT-03 natural_pool_type'));
    expect([...HYDROBOT_TYPE_TOKENS]).toEqual(enumValues('FLLNT-09 hydrobot_type'));
    expect([...FLOW_DIRECTION_TOKENS]).toEqual(enumValues('FLLNT-10 filter_flow_direction'));
    expect([...FLOW_TYPE_TOKENS]).toEqual(enumValues('FLLNT-10 filter_flow_type'));
    expect([...REGENERATION_TECHNIQUE_TOKENS]).toEqual(enumValues('FLLNT-03 regeneration_technique'));
    expect(table1AsTable().rows.map((r) => r.keys.pool_type)).toEqual([...POOL_TYPE_TOKENS]);
    expect(table8PAsTable().rows.map((r) => r.keys.pool_type)).toEqual([...POOL_TYPE_TOKENS]);
    expect(table2SubmergedAsTable().rows.map((r) => r.keys.pool_type)).toEqual(['type_I', 'type_II']);
    expect(table10AsTable().rows.map((r) => r.keys.hydrobot_type)).toEqual([...HYDROBOT_TYPE_TOKENS]);
    expect(table11AsTable().rows.map((r) => r.keys.flow_direction)).toEqual([...FLOW_DIRECTION_TOKENS]);
    expect(table12AsTable().rows.map((r) => r.keys.flow_direction)).toEqual([...FLOW_DIRECTION_TOKENS]);
    // the created select drives TABLE9 with identical value strings; its labels are the printed column heads
    expect((byKey('FLLNT-05', 'substrate_role').enum_values as Array<{ value: string }>).map((o) => o.value)).toEqual([...SUBSTRATE_ROLE_TOKENS]);
    expect(table9AsTable().rows.map((r) => r.keys.substrate_role)).toEqual([...SUBSTRATE_ROLE_TOKENS]);
    expect(Object.values(SUBSTRATE_ROLE_LABELS)).toEqual(['Filter substrate natural pool type III', 'Filter substrate natural pool type IV', 'Plant substrate']);
    // register enum columns carry exactly the prod tokens; lookup_key columns bind the seeded tables
    const fe = registerCfg('FLLNT-10', 'filtereinheiten');
    expect(fe.columns.find((c) => c.key === 'hydrobot_type')).toMatchObject({ type: 'enum', options: [...HYDROBOT_TYPE_TOKENS] });
    expect(fe.columns.find((c) => c.key === 'flow_type')).toMatchObject({ type: 'enum', options: [...FLOW_TYPE_TOKENS] });
    expect(fe.columns.find((c) => c.key === 'flow_direction')).toMatchObject({ type: 'enum', options: [...FLOW_DIRECTION_TOKENS] });
    expect(fe.columns.find((c) => c.key === 'grain_class')).toMatchObject({ type: 'lookup_key', lookup: { table_code: 'TABLE15' } });
    expect(table15AsTable().rows.map((r) => r.keys.grain_class)).toEqual([...GRAIN_CLASS_TOKENS]);
    expect(fe.columns.filter((c) => c.type === 'lookup_key').map((c) => c.key)).toEqual(['grain_class']); // the override toggle binds to the FIRST lookup_key → Tab. 15 (anhaltswert), never Tab. 10 (locked)
    expect(fe.override).toEqual({ flag_key: 'surface_override', applies_to: ['surface_m2_m3'], policy: 'anhaltswert' });
    expect(registerCfg('FLLNT-06', 'zonen').columns.find((c) => c.key === 'technique')).toMatchObject({ type: 'enum', options: [...REGENERATION_TECHNIQUE_TOKENS], visible_when: "zone == 'regeneration'" });
    expect(col('FLLNT-12', 'plant_species_list', 'plant_group')).toMatchObject({ type: 'lookup_key', lookup: { table_code: 'S10_4_3' } });
    expect(s1043AsTable().rows.map((r) => r.keys.plant_group)).toEqual([...PLANT_GROUP_TOKENS]);
    // the Plan-1 column keys of plant_species_list survive the upgrade
    expect(registerCfg('FLLNT-12', 'plant_species_list').columns.map((c) => c.key)).toEqual(['art', 'zone', 'plant_group', 'area_m2', 'density_min', 'density_max', 'density', 'in_range', 'count', 'anzahl']);
    // TABLE7 / TABLE8 literal key 'all' inside the wasserproben row exprs; TABLE8_P keyed on the worksheet's natural_pool_type
    const wp = registerCfg('FLLNT-04', 'wasserproben');
    expect(wp.columns.find((c) => c.key === 'ammonium_ok')!.expr).toContain("lookup('TABLE7', 'all', 'ammonium_max')");
    expect(wp.columns.find((c) => c.key === 'p_total_ok')!.expr).toContain("lookup('TABLE8_P', natural_pool_type, 'p_total_max')");
    expect(wp.columns.find((c) => c.key === 'iron_ok')!.expr).toBe("if(location == 'fill', if(iron <= lookup('TABLE7', 'all', 'iron_max'), 1, 0), 1)");
    expect(wp.columns.find((c) => c.key === 'nitrite')!.visible_when).toBe("location == 'swimming'");
  });

  it('lookup_fill bindings: keys[].column equal the table key_columns; created targets are number / text; drivers are own or inherited symbols of the worksheet', () => {
    const tableKeys: Record<string, string[]> = { TABLE1: table1AsTable().key_columns, TABLE8_P: table8PAsTable().key_columns, TABLE9: table9AsTable().key_columns, TABLE10: table10AsTable().key_columns };
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill')) {
      expect(e.lookup!.keys.map((k) => k.column), e.symbol).toEqual(tableKeys[e.lookup!.table_code]);
      expect(['number', 'text']).toContain(e.create!.data_type);
    }
    expect(FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill' && x.create!.data_type === 'text').map((x) => x.symbol)).toEqual(['regeneration_share_tab1_text', 'flow_tab1_text', 'filter_operation_tab1_text', 'frost_resistance_tab9']);
    // drivers: natural_pool_type own on -03; substrate_role created on -05; hydrobot_type own on -09; NOT consumed on -04 (the two Tab.-8 fills are inert until C-1)
    expect(priorRow('FLLNT-03 natural_pool_type')).toBeDefined();
    expect(byKey('FLLNT-05', 'substrate_role').create).toBeDefined();
    expect(priorRow('FLLNT-09 hydrobot_type')).toBeDefined();
    expect(cons('FLLNT-03 natural_pool_type')).toEqual(['FLLNT-06', 'FLLNT-09', 'FLLNT-10', 'FLLNT-11', 'FLLNT-12', 'FLLNT-14']);
    expect(cons('FLLNT-03 natural_pool_type')).not.toContain('FLLNT-04'); // fll_naturteich-C-1
    expect(cons('FLLNT-03 natural_pool_type')).not.toContain('FLLNT-05'); // why TABLE9 keys on the created substrate_role
  });

  it('visibility never lands on a consumed producer (pinned against the capture, transitive); the withheld rules ARE refused by the emitter; created fields sit in captured sections', () => {
    for (const e of FIELD_CONFIGS.filter((x) => x.visible_when && !x.create)) {
      const row = priorRow(`${e.worksheet} ${e.symbol}`);
      expect(row, `${e.worksheet} ${e.symbol} captured`).toBeDefined();
      expect(row.consumer_worksheets ?? [], `${e.worksheet} ${e.symbol}`).toEqual([]);
      expect(producerChain(prior, e.worksheet, e.symbol), `${e.worksheet} ${e.symbol}`).toBeNull();
    }
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) {
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
      expect(priorRow(`${e.worksheet} ${e.symbol}`), `${e.worksheet} ${e.symbol} must not exist in prod`).toBeUndefined();
    }
    for (const e of FIELD_CONFIGS.filter((x) => !x.create)) expect(priorRow(`${e.worksheet} ${e.symbol}`), `${e.worksheet} ${e.symbol} must exist in prod`).toBeDefined();
    expect(Object.keys(prior.equations ?? {})).toHaveLength(6);
    // why the brief's other rules are STAGED: consumed producers (C-2) — the emitter refuses them
    expect(cons('FLLNT-03 p_binding_required')).toEqual(['FLLNT-10', 'FLLNT-11']);
    expect(cons('FLLNT-11 splash_water_tank_volume')).toEqual(['FLLNT-15']);
    const refused = (ws: string, sym: string, rule: string) => () => emitFieldConfigSql('fll_naturteich', [{ standard: 'FLL-Naturteich', worksheet: ws, symbol: sym, widget: 'scalar', ui_config: null, visible_when: rule, verification_quote: 'x' }], [], prior);
    expect(refused('FLLNT-03', 'p_binding_required', "natural_pool_type == 'type_III'")).toThrow(/consumed by/);
    expect(refused('FLLNT-11', 'splash_water_tank_volume', 'rigid_overflow_used == true')).toThrow(/consumed by/);
    // the EQ-02 inputs on -10 are transitive producers (EQ-02 → filter_colonized_surface_actual → EQ-01 → filter_50x_rule_met, consumed by -15)
    expect(producerChain(prior, 'FLLNT-10', 'grain_specific_surface')).not.toBeNull();
    expect(refused('FLLNT-10', 'grain_specific_surface', NOT_HORIZONTAL)).toThrow(/consumed by/);
    // the section rules on the producer sections of -09 / -10 are refused (C-3) — which is why no section rule is emitted at all
    const refusedSection = (ws: string, code: string) => () => emitFieldConfigSql('fll_naturteich', [], [{ standard: 'FLL-Naturteich', worksheet: ws, section_code: code, visible_when: TYPES_I_III, verification_quote: 'x' }], prior);
    for (const code of ['B', 'C', 'D']) expect(refusedSection('FLLNT-09', code), `FLLNT-09 ${code}`).toThrow(/consumed by/);
    for (const code of ['B', 'C', 'D', 'F']) expect(refusedSection('FLLNT-10', code), `FLLNT-10 ${code}`).toThrow(/consumed by/);
    // the drivers of the emitted rules are in scope: natural_pool_type reaches -09 / -10 (section rules) and is own on -03; filter_flow_direction / hydrobot_type are own
    expect(cons('FLLNT-03 natural_pool_type')).toContain('FLLNT-09');
    expect(cons('FLLNT-03 natural_pool_type')).toContain('FLLNT-10');
    expect(priorRow('FLLNT-10 filter_flow_direction')).toBeDefined();
    // no drainage field exists in prod (the brief's §9.1 rule has no target)
    expect(Object.keys(prior).filter((k) => k.startsWith('FLLNT-07 ') && k.includes('drain'))).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin)', () => {
    const { up, down } = emitFieldConfigSql('fll_naturteich', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    const files = fieldConfigFilesFor('fll_naturteich', '20260917100810');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(3);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(34);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(down).not.toMatch(/worksheet_sections/);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
    expect(down).toContain("f.symbol = 'plant_species_list'"); // the Plan-1 register is restored to the captured NULL widget (the Plan-1 migration is unapplied)
  });
});
