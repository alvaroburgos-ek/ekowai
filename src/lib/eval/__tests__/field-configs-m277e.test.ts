/**
 * Plan 3 Task 4 — DWA-M-277E field configs: every entry parses through the zod
 * contract, the key-string equality rule (G-A3) holds against the captured prod
 * enums and the seeded tables, the emitter accepts the module against the
 * captured prior, visibility never lands on a consumed producer (directly or
 * through a same-worksheet equation chain), and the committed migration equals
 * a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, USE_CATEGORY_LABELS, C2 } from '../field-configs/m277e';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import {
  table2AsTable, table2TypeAsTable, table3AsTable, table1SieversAsTable, table4LimitsAsTable, table4UsesAsTable, table4ProcessesAsTable, table5AsTable, table5AreaAsTable,
  GREYWATER_SOURCE_TOKENS, USE_CATEGORY_TOKENS, QUALITY_CATEGORY_TOKENS, GREYWATER_TYPE_TOKENS, TREATMENT_METHOD_TOKENS, SIEVERS_STATISTIC_TOKENS,
} from '../regulation-tables-seed-m277e';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/m277e.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const cons = (k: string) => priorRow(k).consumer_worksheets ?? [];

describe('DWA-M-277E field configs (Plan 3 Task 4)', () => {
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
    expect(SECTION_VISIBILITY).toEqual([]);
  });

  it('counts: 51 field entries (33 create, 18 update), widgets by kind, 23 field rules, 0 section rules', () => {
    expect(FIELD_CONFIGS).toHaveLength(51);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(33);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['M277E-06 grauwasserquellen', 'M277E-10 nutzungsarten', 'M277E-16 verbraucher_sw', 'M277E-16 bewaesserung_sw', 'M277E-21 speicher_277', 'M277E-24 ablaufproben_treated', 'M277E-18 bilanzperioden']);
    expect(byWidget('lookup_fill')).toEqual([
      'M277E-06 total_coliforms_untreated_range', 'M277E-06 faecal_coliforms_untreated_range',
      'M277E-08 Q_GW_P_sievers', 'M277E-08 COD_sievers', 'M277E-08 BOD5_sievers', 'M277E-08 TN_sievers', 'M277E-08 TP_sievers', 'M277E-08 TS_sievers',
      'M277E-24 turbidity_limit', 'M277E-24 bod5_limit', 'M277E-24 o2_sat_min', 'M277E-24 ph_min_limit', 'M277E-24 ph_max_limit', 'M277E-24 total_coliforms_limit', 'M277E-24 e_coli_limit', 'M277E-24 p_aeruginosa_limit',
    ]);
    expect(byWidget('select_one')).toEqual(['M277E-08 sievers_statistic', 'M277E-10 sampling_location', 'M277E-19 selected_hygienisation', 'M277E-20 membrane_process_selected']);
    expect(byWidget('select_many')).toEqual([]);
    expect(byWidget('derived')).toEqual([
      'M277E-06 greywater_type_code', 'M277E-06 Q_GW_rows', 'M277E-16 Q_SW_rows', 'M277E-16 quality_category_code_rows', 'M277E-05 mbo_authorisation_code',
      'M277E-19 treatment_method_allowed', 'M277E-21 storage_capacity_calc_m3', 'M277E-24 treated_samples_count', 'M277E-24 treated_samples_fail',
    ]);
    expect(byWidget('scalar')).toEqual(['M277E-10 turbidity_NTU', 'M277E-10 BOD5', 'M277E-10 total_coliforms_treated', 'M277E-10 e_coli', 'M277E-10 p_aeruginosa', 'M277E-21 pump_station_capacity', 'M277E-09 pump_station_capacity', 'M277E-24 turbidity_NTU', 'M277E-24 total_coliforms_treated', 'M277E-24 e_coli', 'M277E-24 p_aeruginosa']);
    expect(byWidget('attestation')).toEqual(['M277E-12 drinking_water_option_available', 'M277E-20 uv_disinfection_used', 'M277E-11 WHG_permit_present', 'M277E-24 WHG_permit_present']);
    const rules = FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`);
    expect(rules).toHaveLength(23);
    expect(rules.filter((r) => r.endsWith(C2))).toHaveLength(18); // 6 on -10, 1 on -19, 2 on -20, 4 scalars + 5 created limits on -24
    expect(rules).toContain("M277E-12 drinking_water_option_available :: building_type == 'rented_apartment'");
    expect(rules).toContain("M277E-21 pump_station_capacity :: inflow_type == 'pump_station'");
    expect(rules).toContain("M277E-09 pump_station_capacity :: inflow_type == 'pump_station'");
    expect(rules).toContain('M277E-11 WHG_permit_present :: discharge_into_water_body == true');
    expect(rules).toContain('M277E-24 WHG_permit_present :: discharge_into_water_body == true');
    // the C1-and-C2 limits (O2, pH) are never hidden; the C2-only ones are
    expect(byKey('M277E-24', 'o2_sat_min').visible_when).toBeNull();
    expect(byKey('M277E-24', 'ph_min_limit').visible_when).toBeNull();
    expect(byKey('M277E-24', 'turbidity_limit').visible_when).toBe(C2);
    expect(byKey('M277E-24', 'p_aeruginosa_limit').visible_when).toBe(C2);
    // never hidden: the "no requirement" placeholder (m277e-S-1), source_set (m277e-X-1), the consumed producers (m277e-C-3)
    for (const sym of ['turbidity_NTU_C1', 'source_set', 'UV_transmission_pct', 'DIN_19650_class_documented', 'A', 'Q_SW_A', 'irrigation_season_length']) {
      expect(FIELD_CONFIGS.find((e) => e.symbol === sym), sym).toBeUndefined();
    }
  });

  it('G-A3 key-string equality: table keys and register enum options equal the captured prod enum value strings exactly (upper-case A1…B2 / C1 / C2)', () => {
    expect([...GREYWATER_TYPE_TOKENS]).toEqual(enumValues('M277E-06 greywater_type'));
    expect([...GREYWATER_TYPE_TOKENS]).toEqual(enumValues('M277E-02 greywater_type'));
    expect([...QUALITY_CATEGORY_TOKENS]).toEqual(enumValues('M277E-14 quality_category'));
    expect([...QUALITY_CATEGORY_TOKENS]).toEqual(enumValues('M277E-04 quality_category'));
    expect([...USE_CATEGORY_TOKENS].sort()).toEqual(enumValues('M277E-10 use_category').sort()); // same five strings; the table keeps the printed Tab.-4 row order, prod lists toilet_public second
    expect([...TREATMENT_METHOD_TOKENS].sort()).toEqual(enumValues('M277E-19 treatment_method').sort()); // same eight strings; the table follows the printed Tab.-4 cell order (Stabilisation before MBR)
    expect(table2TypeAsTable().rows.map((r) => r.keys.greywater_type)).toEqual([...GREYWATER_TYPE_TOKENS]);
    expect(table3AsTable().rows.map((r) => r.keys.greywater_type)).toEqual([...GREYWATER_TYPE_TOKENS]);
    expect(table4LimitsAsTable().rows.map((r) => r.keys.quality_category)).toEqual([...QUALITY_CATEGORY_TOKENS]);
    expect(table4UsesAsTable().rows.map((r) => r.keys.use_category)).toEqual([...USE_CATEGORY_TOKENS]);
    expect(table4ProcessesAsTable().rows.map((r) => r.keys.treatment_method)).toEqual([...TREATMENT_METHOD_TOKENS]);
    // TABLE2 keys = the prod Q_GW_P_<source> suffixes (M277E-07)
    for (const s of GREYWATER_SOURCE_TOKENS) expect(priorRow(`M277E-07 Q_GW_P_${s}`), s).toBeDefined();
    expect(table2AsTable().rows.map((r) => r.keys.source)).toEqual([...GREYWATER_SOURCE_TOKENS]);
    // the register enum columns carry exactly the prod tokens
    expect(registerCfg('M277E-10', 'nutzungsarten').columns.find((c) => c.key === 'use_category')!.options).toEqual([...USE_CATEGORY_TOKENS]);
    expect(registerCfg('M277E-16', 'verbraucher_sw').columns.find((c) => c.key === 'use_category')!.options).toEqual([...USE_CATEGORY_TOKENS]);
    expect(registerCfg('M277E-16', 'bewaesserung_sw').columns.find((c) => c.key === 'use_category')!.options).toEqual(['irrigation_lawn', 'irrigation_crops']);
    expect(Object.keys(USE_CATEGORY_LABELS)).toEqual([...USE_CATEGORY_TOKENS]);
    // created select drives its table with identical value strings
    expect((byKey('M277E-08', 'sievers_statistic').enum_values as Array<{ value: string }>).map((o) => o.value)).toEqual([...SIEVERS_STATISTIC_TOKENS]);
    expect(table1SieversAsTable().rows.map((r) => r.keys.statistic)).toEqual([...SIEVERS_STATISTIC_TOKENS]);
    // lookup_key columns bind the seeded tables; the greywater-type rule names the TABLE2 source tokens
    expect(registerCfg('M277E-06', 'grauwasserquellen').columns.find((c) => c.key === 'source')!.lookup).toEqual({ table_code: 'TABLE2' });
    expect(registerCfg('M277E-16', 'verbraucher_sw').columns.find((c) => c.key === 'application')!.lookup).toEqual({ table_code: 'TABLE5' });
    expect(table5AsTable().rows.map((r) => r.keys.application)).toContain('toilets');
    expect(table5AreaAsTable().rows[0].keys.use).toBe('kitchen_garden');
    expect(registerCfg('M277E-16', 'bewaesserung_sw').columns.find((c) => c.key === 'q_sw_a_ref')!.expr).toBe("lookup('TABLE5_AREA', 'kitchen_garden', 'q_sw_a_l_m2')");
    // the treated-sample register reads the Table-4 limit symbols of its own worksheet in row scope (G-13)
    const ok = registerCfg('M277E-24', 'ablaufproben_treated').columns.filter((c) => c.key.endsWith('_ok'));
    expect(ok.map((c) => c.key)).toEqual(['turbidity_ok', 'bod5_ok', 'o2_ok', 'ph_ok', 'total_coliforms_ok', 'e_coli_ok', 'p_aeruginosa_ok', 'sample_ok']);
    for (const sym of ['turbidity_limit', 'bod5_limit', 'o2_sat_min', 'ph_min_limit', 'ph_max_limit', 'total_coliforms_limit', 'e_coli_limit', 'p_aeruginosa_limit']) {
      expect(ok.some((c) => c.expr!.includes(sym)), sym).toBe(true);
      expect(byKey('M277E-24', sym).create?.data_type).toBe('number');
    }
  });

  it('lookup_fill bindings: keys[].column equal the table key_columns; created targets are number/text; keys are own or inherited symbols of the worksheet', () => {
    const tableKeys: Record<string, string[]> = {
      TABLE3: table3AsTable().key_columns, TABLE1_SIEVERS: table1SieversAsTable().key_columns, TABLE4_LIMITS: table4LimitsAsTable().key_columns,
    };
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill')) {
      expect(e.lookup!.keys.map((k) => k.column), e.symbol).toEqual(tableKeys[e.lookup!.table_code]);
      expect(['number', 'text']).toContain(e.create!.data_type);
      if (e.create!.data_type === 'text') expect(e.lookup!.table_code).toBe('TABLE3');
    }
    // key symbols: greywater_type is own on M277E-06; sievers_statistic is created on M277E-08; quality_category reaches M277E-24 from M277E-14
    expect(priorRow('M277E-06 greywater_type')).toBeDefined();
    expect(byKey('M277E-08', 'sievers_statistic').create).toBeDefined();
    expect(cons('M277E-14 quality_category')).toContain('M277E-24');
    for (const r of FIELD_CONFIGS.filter((x) => x.widget === 'register')) {
      const ui = r.ui_config as RegisterUiConfig;
      if (ui.override) expect(ui.columns.find((c) => c.key === ui.override!.flag_key)?.type).toBe('boolean');
    }
    expect(registerCfg('M277E-16', 'verbraucher_sw').override).toEqual({ flag_key: 'q_sw_p_override', applies_to: ['q_sw_p'], policy: 'anhaltswert' });
  });

  it('visibility never lands on a consumed producer (pinned against the capture, transitive); drivers are consumed where a rule must resolve; created fields sit in captured sections', () => {
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
    expect(Object.keys(prior.equations ?? {})).toHaveLength(22);
    // why the brief's other rules are STAGED (m277e-C-3): consumed producers
    expect(cons('M277E-20 UV_transmission_pct')).toEqual(['M277E-24']);
    expect(cons('M277E-11 DIN_19650_class_documented')).toEqual(['M277E-24']);
    expect(cons('M277E-11 A')).toEqual(['M277E-16']);
    expect(cons('M277E-15 Q_SW_A')).toEqual(['M277E-16']);
    expect(cons('M277E-10 use_category')).not.toContain('M277E-15'); // irrigation_season_length has no driver in scope
    // drivers in scope: quality_category reaches -10 (from -04) and -19/-20/-24 (from -14); building_type reaches -12; discharge reaches -11 (from -01) and -24 (from -04); inflow_type is own on -09/-21
    expect(cons('M277E-04 quality_category')).toContain('M277E-10');
    for (const ws of ['M277E-19', 'M277E-20', 'M277E-24']) expect(cons('M277E-14 quality_category')).toContain(ws);
    expect(cons('M277E-01 building_type')).toContain('M277E-12');
    expect(cons('M277E-01 discharge_into_water_body')).toContain('M277E-11');
    expect(cons('M277E-04 discharge_into_water_body')).toContain('M277E-24');
    expect(priorRow('M277E-21 inflow_type')).toBeDefined();
    expect(priorRow('M277E-09 inflow_type')).toBeDefined();
    // the equation inputs of the two scalar rules are in scope: storage_capacity_m3 (-01 → -05), quality_category (-14 → -19) + treatment_method own on -19
    expect(cons('M277E-01 storage_capacity_m3')).toContain('M277E-05');
    expect(priorRow('M277E-19 treatment_method')).toBeDefined();
    // the equation outputs of the register worksheets are not consumed anywhere yet (the consumer edits are m277e-C-1 / -C-2)
    expect(cons('M277E-06 source_set')).toEqual(['M277E-17']);
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin)', () => {
    // Task 12c: the re-captured prior carries `gates`; the module still holds 6 rules the gate-aware guard refuses
    // (M277E-10 turbidity_NTU / total_coliforms_treated / e_coli / p_aeruginosa ← REQ-08/-14/-14E/-15 (bare vs quoted C2); M277E-19 selected_hygienisation + M277E-09 pump_station_capacity ← REQ-31 (empty condition, parse_error)) — listed in
    // .superpowers/sdd/2026-09-16-guideline-to-tool-plan-3-encode-29-standards/task-12c-refusals.md for the fix round
    // (move to STAGED or sign off as a G-block). Until then the pin emits in warn mode and pins the EXACT count so a
    // fix round that clears them must flip this back to the default (refuse) mode.
    expect(() => emitFieldConfigSql('m277e', FIELD_CONFIGS, SECTION_VISIBILITY, prior)).toThrow(/read by gate .* — hidden ⇒ null ⇒ the gate stops enforcing; STAGE as a G-block/);
    const { up, down, warnings } = emitFieldConfigSql('m277e', FIELD_CONFIGS, SECTION_VISIBILITY, prior, { gate_guard: 'warn' });
    expect(warnings.filter((w) => w.startsWith('GATE-REFUSAL (warn mode) '))).toHaveLength(6);
    const files = fieldConfigFilesFor('m277e', '20260917100410');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(18);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(33);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
  });
});
