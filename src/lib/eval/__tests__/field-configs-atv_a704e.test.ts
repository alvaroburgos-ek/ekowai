/**
 * Plan 3 Task 27 — ATV-A-704E field configs: every entry parses through the zod
 * contract, every register enum column equals the captured prod `enum_values`
 * byte-for-byte (D-1 / G-A3) and every rule literal is a prod token, no register
 * column is keyed `id` or shadows a prod symbol of its worksheet (amendment P),
 * the THREE UPDATEs on existing fields are consumer-free and gate-free and their
 * drivers live on the same worksheet, every other brief target is REFUSED by the
 * emitter's own guards (asserted, not discovered: CR-025 / CR-026 gate readers, the
 * producer chain of `parallel_analysis_performed`, the -09 C / -10 C / -10 D section
 * rules through CR-019 / CR-022 / CR-023 and the EQ-02 / EQ-05 / EQ-06 hops), the two
 * WITHHELD section rules are ACCEPTED by the emitter (withheld because their driver is
 * not inherited — C-2, so the withholding is a recorded judgment, not a guard
 * artefact), the O-1 absences hold, and the committed migration equals a fresh emit.
 *
 * ATV-A-704E has NO TRANSCRIPT: every cue is a cell of the read-only prod capture
 * (grade EV) and NO regulation table is seeded — pinned here too.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FIELD_CONFIGS, SECTION_VISIBILITY, STAGED_SECTION_RULES,
  PARAMETERS, APPLICATION_MODES, QA_MEASURES, EQUIPMENT, INTERVALS, IQC_CARDS,
  AUTOMATIC_SAMPLING, PHOTOMETER, MULTI, EQ_OR_PAR, THERMOBLOCK, PIPETTES, PARALLEL_MODE, PLAUSIBILITY,
  ROW_PIPETTE, ROW_THERMOBLOCK, ROW_PHOTOMETER,
  DILUTION_CALC_EXPR, DILUTION_DEV_EXPR, NSS_EXPR, SPIKE_DEV_EXPR, COMPARISON_DEV_EXPR,
} from '../field-configs/atv_a704e';
import { PROD_ENUM, PROD_GATE, PROD_EQUATION, PROD_FIELD_QUOTE, PROD_STANDARD } from '../field-configs/atv_a704e-quotes';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { SEED_BUILDERS } from '../regulation-tables-seed-index';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain, gateReaders } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'ATV-A-704E';
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/atv_a704e.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string) => (priorRow(key).enum_values as Array<{ value: string; label_de: string }>).map((e) => ({ value: e.value, label_de: e.label_de }));
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prodSymbols = (ws: string) => Object.keys(prior).filter((k) => k.startsWith(`${ws} `)).map((k) => k.slice(ws.length + 1));
const rule = (ws: string, sym: string, visible_when: string) => ({ standard: STD, worksheet: ws, symbol: sym, widget: 'scalar' as const, ui_config: null, visible_when, verification_quote: 'q' });
const sec = (ws: string, code: string, visible_when: string) => [{ standard: STD, worksheet: ws, section_code: code, visible_when, verification_quote: 'q' }];

describe('ATV-A-704E field configs (Plan 3 Task 27)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; no section rules; no register column keyed `id` or shadowing a prod symbol of its worksheet; every quote is a prod capture cell marked EV', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      if (e.create) expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(e.verification_quote, `${e.symbol} EV marker`).toContain('[prod verification_quote — EV, unverified: ATV-A-704E has NO transcript');
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
    // every cue is a cell of the read-only capture (91 / 91 prod fields carry a verification_quote; 0 carry a source_quote)
    expect(Object.keys(PROD_FIELD_QUOTE)).toHaveLength(91);
    expect(PROD_STANDARD.code).toBe('ATV-A-704E');
    expect(PROD_STANDARD.version).toBe('April 2007');
    // NO table is seeded for this standard (no transcript — atv_a704e-U-1 … U-6)
    expect(Object.keys(SEED_BUILDERS)).not.toContain('atv_a704e');
  });

  it('counts: 24 entries = 21 create (9 registers, 12 derived outputs) + 3 UPDATE (precipitation_influence, storage_temperature, photometer_check_done); the emitted rules and their drivers; the pruefmittel register carries three row-scope rules', () => {
    expect(FIELD_CONFIGS).toHaveLength(24);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual([
      'ATV-A-704E-06 precipitation_influence', 'ATV-A-704E-06 storage_temperature', 'ATV-A-704E-11 photometer_check_done',
    ]);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual([
      'ATV-A-704E-01 betriebsmethoden', 'ATV-A-704E-08 qs_massnahmen',
      'ATV-A-704E-09 einzelbestimmungen', 'ATV-A-704E-09 verduennungsversuche', 'ATV-A-704E-09 aufstockungsversuche',
      'ATV-A-704E-10 vergleichsmessungen', 'ATV-A-704E-11 pruefmittel', 'ATV-A-704E-12 mitarbeiter', 'ATV-A-704E-12 abweichungen',
    ]);
    expect(byWidget('derived')).toEqual([
      'ATV-A-704E-08 qa_measures_count',
      'ATV-A-704E-09 n_determinations_calc', 'ATV-A-704E-09 mean_value_calc', 'ATV-A-704E-09 max_dev_pct_calc',
      'ATV-A-704E-09 dilution_max_dev', 'ATV-A-704E-09 spike_max_dev',
      'ATV-A-704E-10 equivalency_max_dev', 'ATV-A-704E-10 parallel_max_dev',
      'ATV-A-704E-11 pruefmittel_count', 'ATV-A-704E-11 pipette_dev_max',
      'ATV-A-704E-12 mitarbeiter_count', 'ATV-A-704E-12 abweichungen_count',
    ]);
    expect(byWidget('select_one')).toEqual(['ATV-A-704E-06 precipitation_influence']);
    expect(byWidget('scalar')).toEqual(['ATV-A-704E-06 storage_temperature']);
    expect(byWidget('attestation')).toEqual(['ATV-A-704E-11 photometer_check_done']);
    expect(byWidget('select_many')).toEqual([]);
    expect(byWidget('lookup_fill')).toEqual([]);
    const vis = FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`);
    expect(vis).toEqual([
      `ATV-A-704E-06 precipitation_influence :: ${AUTOMATIC_SAMPLING}`,
      `ATV-A-704E-06 storage_temperature :: ${AUTOMATIC_SAMPLING}`,
      `ATV-A-704E-09 einzelbestimmungen :: ${MULTI}`,
      `ATV-A-704E-09 n_determinations_calc :: ${MULTI}`,
      `ATV-A-704E-09 mean_value_calc :: ${MULTI}`,
      `ATV-A-704E-09 max_dev_pct_calc :: ${MULTI}`,
      `ATV-A-704E-10 vergleichsmessungen :: ${EQ_OR_PAR}`,
      `ATV-A-704E-10 equivalency_max_dev :: ${EQ_OR_PAR}`,
      `ATV-A-704E-10 parallel_max_dev :: ${EQ_OR_PAR}`,
      `ATV-A-704E-11 photometer_check_done :: ${PHOTOMETER}`,
    ]);
    expect(AUTOMATIC_SAMPLING).toBe("sampling_method == 'automatic'");
    expect(PHOTOMETER).toBe("testing_equipment == 'photometer'");
    expect(MULTI).toBe('multiple_determination_performed == true');
    expect(EQ_OR_PAR).toBe('equivalency_check_performed == true OR parallel_analysis_performed == true');
    // the drivers resolve where the rules live: sampling_method / testing_equipment are fields of their own worksheet; the §4.4 booleans (-05) are inherited on -09 / -10
    expect(priorRow('ATV-A-704E-06 sampling_method')).toMatchObject({ data_type: 'enum', consumer_worksheets: null });
    expect(priorRow('ATV-A-704E-11 testing_equipment')).toMatchObject({ data_type: 'enum', consumer_worksheets: null });
    expect(priorRow('ATV-A-704E-05 multiple_determination_performed').consumer_worksheets).toEqual(['ATV-A-704E-09']);
    expect(priorRow('ATV-A-704E-05 equivalency_check_performed').consumer_worksheets).toEqual(['ATV-A-704E-10']);
    expect(priorRow('ATV-A-704E-05 parallel_analysis_performed').consumer_worksheets).toEqual(['ATV-A-704E-10']);
    const rowRules = registerCfg('ATV-A-704E-11', 'pruefmittel').columns.filter((c) => c.visible_when).map((c) => `${c.key} :: ${c.visible_when}`);
    expect(rowRules).toEqual([`pipette_volume_ml :: ${ROW_PIPETTE}`, `pipette_dev_pct :: ${ROW_PIPETTE}`, `heating_dev_c :: ${ROW_THERMOBLOCK}`, `photometer_check :: ${ROW_PHOTOMETER}`]);
    expect(ROW_PIPETTE).toBe("equipment == 'piston_stroke_pipettes'");
    expect(ROW_THERMOBLOCK).toBe("equipment == 'heating_device_thermoblock'");
    expect(ROW_PHOTOMETER).toBe("equipment == 'photometer'");
  });

  it('G-A3 / D-1 key-string equality: every register enum column equals the captured prod enum_values (value + label_de byte-for-byte); every rule literal is a prod token; the created fields land in captured sections and derived outputs are numbers', () => {
    expect(PARAMETERS).toEqual(PROD_ENUM['ATV-A-704E-01 parameter_name']);
    expect(APPLICATION_MODES).toEqual(PROD_ENUM['ATV-A-704E-03 application_mode']);
    expect(QA_MEASURES).toEqual(PROD_ENUM['ATV-A-704E-08 qa_measure']);
    expect(EQUIPMENT).toEqual(PROD_ENUM['ATV-A-704E-11 testing_equipment']);
    expect(INTERVALS).toEqual(PROD_ENUM['ATV-A-704E-11 monitoring_interval']);
    expect(IQC_CARDS).toEqual(PROD_ENUM['ATV-A-704E-12 deviation_iqc_card_ref']);
    expect(PARAMETERS).toEqual(enumValues('ATV-A-704E-01 parameter_name'));
    expect(EQUIPMENT).toEqual(enumValues('ATV-A-704E-11 testing_equipment'));
    expect(PARAMETERS.map((p) => p.value)).toEqual(['settable_substances', 'bod5', 'cod', 'nh4_n', 'no3_n', 'no2_n', 'p_total', 'tn', 'toc']);
    expect(QA_MEASURES).toHaveLength(9);
    expect(EQUIPMENT).toHaveLength(16);
    expect(INTERVALS).toHaveLength(5);
    expect(IQC_CARDS).toHaveLength(11);
    // rule literals are prod tokens
    expect(enumValues('ATV-A-704E-06 sampling_method').map((e) => e.value)).toContain('automatic');
    expect(enumValues('ATV-A-704E-11 testing_equipment').map((e) => e.value)).toEqual(expect.arrayContaining(['photometer', 'piston_stroke_pipettes', 'heating_device_thermoblock']));
    expect(enumValues('ATV-A-704E-03 application_mode').map((e) => e.value)).toContain('parallel_to_reference');
    for (const c of [THERMOBLOCK, PIPETTES, PARALLEL_MODE]) expect(parseCondition(c), c).not.toBeNull();
    expect(THERMOBLOCK).toBe("testing_equipment == 'heating_device_thermoblock'");
    expect(PIPETTES).toBe("testing_equipment == 'piston_stroke_pipettes'");
    expect(PARALLEL_MODE).toBe("application_mode == 'parallel_to_reference'");
    expect(PLAUSIBILITY).toBe('blank_and_standard_controlled == true');
    // the register enum columns offer exactly the prod token lists
    const col = (ws: string, sym: string, key: string) => registerCfg(ws, sym).columns.find((c) => c.key === key)!;
    for (const [ws, sym] of [['ATV-A-704E-01', 'betriebsmethoden'], ['ATV-A-704E-09', 'einzelbestimmungen'], ['ATV-A-704E-09', 'verduennungsversuche'], ['ATV-A-704E-09', 'aufstockungsversuche'], ['ATV-A-704E-10', 'vergleichsmessungen']]) {
      expect(col(ws, sym, 'parameter').options, `${sym}.parameter`).toEqual(PARAMETERS.map((p) => p.value));
      expect(col(ws, sym, 'parameter').option_labels, `${sym}.parameter labels`).toEqual(Object.fromEntries(PARAMETERS.map((p) => [p.value, p.label_de])));
    }
    expect(col('ATV-A-704E-01', 'betriebsmethoden', 'application_mode').options).toEqual(APPLICATION_MODES.map((p) => p.value));
    expect(col('ATV-A-704E-08', 'qs_massnahmen', 'measure').options).toEqual(QA_MEASURES.map((p) => p.value));
    expect(col('ATV-A-704E-11', 'pruefmittel', 'equipment').options).toEqual(EQUIPMENT.map((p) => p.value));
    expect(col('ATV-A-704E-11', 'pruefmittel', 'interval').options).toEqual(INTERVALS.map((p) => p.value));
    expect(col('ATV-A-704E-12', 'abweichungen', 'iqc_card_ref').options).toEqual(IQC_CARDS.map((p) => p.value));
    expect(col('ATV-A-704E-10', 'vergleichsmessungen', 'kind').options).toEqual(['equivalency', 'parallel']); // the row type, not a prod enum (one register for IQC-Card 6 and 7)
    // created fields: captured sections, data types
    const sections: Record<string, string> = {
      'ATV-A-704E-01 betriebsmethoden': 'D',
      'ATV-A-704E-08 qs_massnahmen': 'E', 'ATV-A-704E-08 qa_measures_count': 'E',
      'ATV-A-704E-09 einzelbestimmungen': 'C', 'ATV-A-704E-09 n_determinations_calc': 'C', 'ATV-A-704E-09 mean_value_calc': 'C', 'ATV-A-704E-09 max_dev_pct_calc': 'C',
      'ATV-A-704E-09 verduennungsversuche': 'D', 'ATV-A-704E-09 dilution_max_dev': 'D',
      'ATV-A-704E-09 aufstockungsversuche': 'E', 'ATV-A-704E-09 spike_max_dev': 'E',
      'ATV-A-704E-10 vergleichsmessungen': 'C', 'ATV-A-704E-10 equivalency_max_dev': 'C', 'ATV-A-704E-10 parallel_max_dev': 'D',
      'ATV-A-704E-11 pruefmittel': 'C', 'ATV-A-704E-11 pruefmittel_count': 'C', 'ATV-A-704E-11 pipette_dev_max': 'C',
      'ATV-A-704E-12 mitarbeiter': 'C', 'ATV-A-704E-12 mitarbeiter_count': 'C', 'ATV-A-704E-12 abweichungen': 'D', 'ATV-A-704E-12 abweichungen_count': 'D',
    };
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) {
      expect(e.create!.section_code, `${e.worksheet} ${e.symbol} section`).toBe(sections[`${e.worksheet} ${e.symbol}`]);
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} captured section`).toBe(true);
      expect(e.create!.data_type, e.symbol).toBe(e.widget === 'register' ? 'json' : 'number');
    }
    // O-1: none of the created symbols exists in prod (all CREATED by 20260917102710)
    for (const s of ['betriebsmethoden', 'qs_massnahmen', 'qa_measures_count', 'einzelbestimmungen', 'n_determinations_calc', 'mean_value_calc', 'max_dev_pct_calc', 'verduennungsversuche', 'dilution_max_dev', 'aufstockungsversuche', 'spike_max_dev', 'vergleichsmessungen', 'equivalency_max_dev', 'parallel_max_dev', 'pruefmittel', 'pruefmittel_count', 'pipette_dev_max', 'mitarbeiter', 'mitarbeiter_count', 'abweichungen', 'abweichungen_count']) {
      expect(Object.keys(prior).filter((k) => k.endsWith(` ${s}`)), s).toEqual([]);
    }
  });

  it('registers: the row expressions re-express the stored EQ-03 / EQ-04 / EQ-05 / EQ-06 math; every footer symbol is a created derived output of the same worksheet; no override block (no table is seeded); no figure inside a row expression', () => {
    const verd = registerCfg('ATV-A-704E-09', 'verduennungsversuche');
    expect(verd.columns.find((c) => c.key === 'calculated')!.expr).toBe(DILUTION_CALC_EXPR);
    expect(DILUTION_CALC_EXPR).toBe('total_volume_ml / sample_volume_ml * measured_diluted'); // EQ-03: (total_volume / sample_volume) * measured_value_diluted_sample
    expect(verd.columns.find((c) => c.key === 'dev_pct')!.expr).toBe(DILUTION_DEV_EXPR);
    expect(verd.columns.filter((c) => c.required).map((c) => c.key)).toEqual(['sample_volume_ml', 'total_volume_ml', 'measured_diluted', 'reference']);
    const auf = registerCfg('ATV-A-704E-09', 'aufstockungsversuche');
    expect(auf.columns.find((c) => c.key === 'nss_nominal')!.expr).toBe(NSS_EXPR);
    expect(NSS_EXPR).toBe('(sample_volume_ml * measured_original + standard_volume_ml * standard_concentration) / (sample_volume_ml + standard_volume_ml)');
    expect(auf.columns.find((c) => c.key === 'dev_pct')!.expr).toBe(SPIKE_DEV_EXPR);
    const vgl = registerCfg('ATV-A-704E-10', 'vergleichsmessungen');
    expect(vgl.columns.find((c) => c.key === 'dev_pct')!.expr).toBe(COMPARISON_DEV_EXPR);
    expect(COMPARISON_DEV_EXPR).toBe('(operating_value - reference_value) / reference_value * 100'); // EQ-05 and EQ-06 have the same shape; the denominator is the row's reference (J-2: no second `nominal_value` column)
    expect(vgl.columns.map((c) => c.key)).toEqual(['kind', 'parameter', 'date', 'operating_value', 'reference_value', 'dev_pct']);
    expect(vgl.columns.find((c) => c.key === 'kind')!.discriminator).toBe(true);
    const einz = registerCfg('ATV-A-704E-09', 'einzelbestimmungen');
    expect(einz.columns.map((c) => [c.key, c.type])).toEqual([['parameter', 'enum'], ['date', 'date'], ['single_result', 'number'], ['unit', 'text']]);
    expect(einz.columns.filter((c) => c.required).map((c) => c.key)).toEqual(['parameter', 'date', 'single_result']);
    expect(einz.columns.find((c) => c.type === 'derived')).toBeUndefined(); // F-1: a row expression cannot read an aggregate of its own register
    // footers point at created derived outputs of the same worksheet; no override block anywhere
    const created = new Set(FIELD_CONFIGS.filter((e) => e.create && e.widget === 'derived').map((e) => `${e.worksheet} ${e.symbol}`));
    const footers: Record<string, string[]> = {
      'ATV-A-704E-08 qs_massnahmen': ['qa_measures_count'],
      'ATV-A-704E-09 einzelbestimmungen': ['n_determinations_calc', 'mean_value_calc', 'max_dev_pct_calc'],
      'ATV-A-704E-09 verduennungsversuche': ['dilution_max_dev'],
      'ATV-A-704E-09 aufstockungsversuche': ['spike_max_dev'],
      'ATV-A-704E-10 vergleichsmessungen': ['equivalency_max_dev', 'parallel_max_dev'],
      'ATV-A-704E-11 pruefmittel': ['pruefmittel_count', 'pipette_dev_max'],
      'ATV-A-704E-12 mitarbeiter': ['mitarbeiter_count'],
      'ATV-A-704E-12 abweichungen': ['abweichungen_count'],
    };
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'register')) {
      const cfg = e.ui_config as RegisterUiConfig;
      expect(cfg.footer ?? null, `${e.symbol} footer`).toEqual(footers[`${e.worksheet} ${e.symbol}`] ?? null);
      for (const f of cfg.footer ?? []) expect(created.has(`${e.worksheet} ${f}`), `${e.symbol} footer ${f}`).toBe(true);
      expect(cfg.override, `${e.symbol} override`).toBeUndefined();
      expect(cfg.catalog, `${e.symbol} catalog`).toBeUndefined();
      // the ONLY figure any row expression may carry is the printed "× 100" of the percentage forms (stored in EQ-02 / EQ-05 / EQ-06 themselves)
      for (const c of cfg.columns.filter((x) => x.expr)) expect(c.expr!.split('* 100').join(''), `${e.symbol}.${c.key}`).not.toMatch(/\b\d+(\.\d+)?\b/);
      for (const c of cfg.columns) expect(c.lookup, `${e.symbol}.${c.key} lookup`).toBeUndefined(); // no table seeded (U-1 … U-6)
    }
    expect(registerCfg('ATV-A-704E-01', 'betriebsmethoden').footer).toBeUndefined();
  });

  it('guards: the three UPDATEs are consumer-free and gate-free; CR-026 refuses the thermoblock hide (G-1), CR-025 refuses both pipette hides (G-3), the producer guard refuses parallel_analysis_performed (C-1); the -09 C / -10 C / -10 D section rules are refused through CR-019 / CR-022 / CR-023 (G-2) while -09 D / E are ACCEPTED and withheld only because their driver is not inherited (C-2); the IF-guard exemption the G-blocks rely on', () => {
    for (const [ws, sym, vw] of [['ATV-A-704E-06', 'precipitation_influence', AUTOMATIC_SAMPLING], ['ATV-A-704E-06', 'storage_temperature', AUTOMATIC_SAMPLING], ['ATV-A-704E-11', 'photometer_check_done', PHOTOMETER]] as Array<[string, string, string]>) {
      expect(gateReaders(prior, ws, sym, vw), `${sym} gate readers`).toEqual([]);
      expect(producerChain(prior, ws, sym), `${sym} chain`).toBeNull();
      expect(() => emitFieldConfigSql('atv_a704e', [rule(ws, sym, vw)], [], prior), `${sym} accepted`).not.toThrow();
    }
    const refused: Array<[string, string, string, string[], RegExp | null]> = [
      ['ATV-A-704E-11', 'heating_device_deviation', THERMOBLOCK, ['CR-026'], null],
      ['ATV-A-704E-11', 'pipette_tested_volume', PIPETTES, ['CR-025'], null],
      ['ATV-A-704E-11', 'pipette_deviation_pct', PIPETTES, ['CR-025'], null],
      ['ATV-A-704E-05', 'parallel_analysis_performed', PARALLEL_MODE, [], /parallel_analysis_performed \(consumed by ATV-A-704E-10\)/],
    ];
    for (const [ws, sym, vw, gates, chain] of refused) {
      expect(priorRow(`${ws} ${sym}`), `${ws} ${sym} captured`).toBeDefined();
      expect(gateReaders(prior, ws, sym, vw).map((g) => g.code), `${sym} gate readers`).toEqual(gates);
      if (chain) expect(producerChain(prior, ws, sym), `${sym} chain`).toMatch(chain); else expect(producerChain(prior, ws, sym), `${sym} chain`).toBeNull();
      expect(() => emitFieldConfigSql('atv_a704e', [rule(ws, sym, vw)], [], prior), `${sym} refusal`).toThrow(chain ? /consumed by another worksheet/ : /read by gate/);
      expect(FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym && e.visible_when), `${sym} not emitted`).toBeUndefined();
    }
    // section rules: the five the brief asks for, kept as data
    expect(STAGED_SECTION_RULES.map((r) => `${r.worksheet} ${r.section_code} :: ${r.visible_when} → ${r.block}`)).toEqual([
      `ATV-A-704E-09 C :: ${MULTI} → atv_a704e-G-2`,
      `ATV-A-704E-09 D :: ${PLAUSIBILITY} → atv_a704e-C-2`,
      `ATV-A-704E-09 E :: ${PLAUSIBILITY} → atv_a704e-C-2`,
      'ATV-A-704E-10 C :: equivalency_check_performed == true → atv_a704e-G-2',
      'ATV-A-704E-10 D :: parallel_analysis_performed == true → atv_a704e-G-2',
    ]);
    for (const r of STAGED_SECTION_RULES.filter((x) => x.block === 'atv_a704e-G-2')) {
      expect(() => emitFieldConfigSql('atv_a704e', [], sec(r.worksheet, r.section_code, r.visible_when), prior), `${r.worksheet} ${r.section_code}`).toThrow(/read by gate/);
    }
    expect(() => emitFieldConfigSql('atv_a704e', [], sec('ATV-A-704E-09', 'C', MULTI), prior)).toThrow(/hides deviation_single_pct read by gate CR-019/);
    expect(() => emitFieldConfigSql('atv_a704e', [], sec('ATV-A-704E-09', 'C', MULTI), prior)).toThrow(/hides mean_value → EQ-02 deviation_single_pct read by gate CR-019/);
    expect(() => emitFieldConfigSql('atv_a704e', [], sec('ATV-A-704E-10', 'C', 'equivalency_check_performed == true'), prior)).toThrow(/CR-022/);
    expect(() => emitFieldConfigSql('atv_a704e', [], sec('ATV-A-704E-10', 'D', 'parallel_analysis_performed == true'), prior)).toThrow(/CR-023/);
    // -09 D / E: the emitter ACCEPTS them — withheld because blank_and_standard_controlled (-05) never reaches -09 (C-2)
    for (const r of STAGED_SECTION_RULES.filter((x) => x.block === 'atv_a704e-C-2')) {
      expect(() => emitFieldConfigSql('atv_a704e', [], sec(r.worksheet, r.section_code, r.visible_when), prior), `${r.worksheet} ${r.section_code}`).not.toThrow();
    }
    expect(priorRow('ATV-A-704E-05 blank_and_standard_controlled').consumer_worksheets).toEqual(['ATV-A-704E-07']); // never reaches -09
    // the IF-guard exemption G-1 / G-2 / G-3 rely on: once the gate reads `IF <driver> == <token> THEN <check>` the hide is no longer refused
    const guarded: PriorSnapshot = { ...prior, gates: { ...prior.gates, 'ATV-A-704E-11 CR-026': { ...prior.gates!['ATV-A-704E-11 CR-026'], condition: "IF testing_equipment == 'heating_device_thermoblock' THEN heating_device_deviation <= 3" } } };
    expect(gateReaders(guarded, 'ATV-A-704E-11', 'heating_device_deviation', THERMOBLOCK)).toEqual([]);
  });

  it('the captured prod facts this task builds on: 91 fields / 101 sections / 6 equations / 30 gates (3 with an EMPTY condition, which never refuse), no self-consumers, the two "ALL" consumer tokens that reach no worksheet, and the 23 attest_* booleans that stay', () => {
    expect(Object.keys(prior.gates!)).toHaveLength(30);
    expect(Object.entries(prior.gates!).filter(([, g]) => g.parse_error).map(([k]) => k)).toEqual(['ATV-A-704E-05 CR-029', 'ATV-A-704E-07 CR-028', 'ATV-A-704E-08 CR-030']);
    for (const code of ['CR-028', 'CR-029', 'CR-030']) expect(PROD_GATE[code].condition).toBe('');
    expect(Object.keys(prior.equations!)).toEqual(['ATV-A-704E-09 EQ-01', 'ATV-A-704E-09 EQ-02', 'ATV-A-704E-09 EQ-03', 'ATV-A-704E-09 EQ-04', 'ATV-A-704E-10 EQ-05', 'ATV-A-704E-10 EQ-06']);
    expect(Object.keys(PROD_EQUATION)).toEqual(['EQ-01', 'EQ-02', 'EQ-03', 'EQ-04', 'EQ-05', 'EQ-06']);
    expect(PROD_GATE['CR-019']).toMatchObject({ worksheet: 'ATV-A-704E-09', severity: 'warn', condition: 'deviation_single_pct <= qa_quality_target_pct' });
    expect(PROD_GATE['CR-022']).toMatchObject({ worksheet: 'ATV-A-704E-10', condition: 'deviation_equivalency_pct <= qa_quality_target_pct' });
    expect(PROD_GATE['CR-023']).toMatchObject({ worksheet: 'ATV-A-704E-10', condition: 'deviation_parallel_pct <= qa_quality_target_pct' });
    expect(PROD_GATE['CR-025']).toMatchObject({ worksheet: 'ATV-A-704E-11', severity: 'block', condition: '(pipette_tested_volume <= 0.5 AND pipette_deviation_pct <= 2) OR (pipette_tested_volume >= 1.0 AND pipette_deviation_pct <= 1)' });
    expect(PROD_GATE['CR-026']).toMatchObject({ worksheet: 'ATV-A-704E-11', severity: 'block', condition: 'heating_device_deviation <= 3' });
    // O-1 (brief premise refuted by the capture): CR-020 / CR-021 are IQC-Card 2 ATTESTATION gates on -08, not the dilution / spiking deviation gates the brief's G-2 names
    for (const code of ['CR-020', 'CR-021']) {
      expect(PROD_GATE[code].worksheet).toBe('ATV-A-704E-08');
      expect(PROD_GATE[code].condition).toMatch(/^attest_atv_a_704e_08_cr_0\d\d == True$/);
      expect(PROD_GATE[code].requires_attestation).toBe(true);
    }
    // the attest_* booleans stay (deactivation is Phase 6 — atv_a704e-X-1). O-2: the brief / inventory say "23";
    // the live capture holds 21 (8 on -01, 4 on -03, 2 on -05, 3 on -07, 4 on -08) — the premise is refuted, never rounded up.
    const attests = Object.keys(prior).filter((k) => k.includes(' attest_'));
    expect(attests).toHaveLength(21);
    expect(attests.filter((k) => k.startsWith('ATV-A-704E-01 '))).toHaveLength(8);
    expect(attests.filter((k) => k.startsWith('ATV-A-704E-03 '))).toHaveLength(4);
    expect(attests.filter((k) => k.startsWith('ATV-A-704E-05 '))).toHaveLength(2);
    expect(attests.filter((k) => k.startsWith('ATV-A-704E-07 '))).toHaveLength(3);
    expect(attests.filter((k) => k.startsWith('ATV-A-704E-08 '))).toHaveLength(4);
    for (const a of attests) expect(FIELD_CONFIGS.find((e) => `${e.worksheet} ${e.symbol}` === a)).toBeUndefined();
    // self-consumers: none (Task 12b class does not apply here)
    for (const [k, r] of Object.entries(prior)) {
      if (!k.includes(' ') || ['sections', 'equations', 'gates', '_meta'].includes(k)) continue;
      expect((r as Row).consumer_worksheets ?? [], k).not.toContain(k.split(' ')[0]);
    }
    // the two "ALL" tokens `loadInheritedFields` never matches (m820_3 trap 4) — no rule of this task keys on them
    const allTokens = Object.entries(prior).filter(([k, r]) => k.includes(' ') && ((r as Row).consumer_worksheets ?? []).some((c) => !/^ATV-A-704E-\d\d$/.test(c))).map(([k]) => k);
    expect(allTokens).toEqual(['ATV-A-704E-01 aqa_applied', 'ATV-A-704E-01 parameter_name']);
    expect(priorRow('ATV-A-704E-01 parameter_name').consumer_worksheets).toEqual(['ALL']);
    for (const e of FIELD_CONFIGS) expect(e.visible_when ?? '', e.symbol).not.toContain('parameter_name');
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin, default refuse mode, no warnings): 21 INSERTs, 3 UPDATEs, 0 section UPDATEs, no enum_values UPDATE (D-1)', () => {
    const { up, down, warnings } = emitFieldConfigSql('atv_a704e', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('atv_a704e', '20260917102710');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(3);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(21);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
    expect(up).toMatch(/^UPDATE fields f SET widget = 'select_one', ui_config = NULL, lookup = NULL, visible_when = 'sampling_method == ''automatic''' FROM .* AND f\.symbol = 'precipitation_influence' AND w\.code = 'ATV-A-704E-06'/m);
    expect(up).toMatch(/^UPDATE fields f SET widget = 'attestation', ui_config = NULL, lookup = NULL, visible_when = 'testing_equipment == ''photometer''' FROM .* AND f\.symbol = 'photometer_check_done' AND w\.code = 'ATV-A-704E-11'/m);
    expect(up).not.toContain('regulation_table'); // no table seeded for this standard
  });
});
