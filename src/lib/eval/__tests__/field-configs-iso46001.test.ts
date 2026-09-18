/**
 * Plan 3 Task 22 — ISO-46001 field configs: every entry parses through the
 * zod contract, no register column is keyed `id` (amendment P), the key-string
 * rule (G-A3) holds between the created `industry_sector` select and TABLED1,
 * the printed lists (roles, output classes, source kinds, §9.1 items) are
 * asserted inside their spans, every refusal that went to STAGED / the sheet
 * is asserted through the emitter's own guards (not discovered), the
 * amendment-K pairs are counted against the capture, no quoted literal
 * collides with a column key or a prod symbol, and the committed migration
 * equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FIELD_CONFIGS, SECTION_VISIBILITY, BASELINE_TRIGGERED, DESIGNING, PROCURING, INPUT_ROLE, OUTPUT_ROLE,
  STREAM_ROLES, STREAM_ROLE_LABELS, OUTPUT_TYPES, OUTPUT_TYPE_LABELS, SOURCE_KINDS, SOURCE_CLASSES, SOURCE_CLASS_LABELS, MONITORING_ITEMS, INDICATOR_DATALIST, INDUSTRY_SECTORS,
  BALANCE_TERM_EXPR, INDICATOR_VALUE_EXPR, DELTA_VS_BASELINE_EXPR,
} from '../field-configs/iso46001';
import { EQUATIONS } from '../equations/iso46001';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { tableD1AsTable, tableA1AsTable, TABLEA1_AREA_DATALIST, collapse } from '../regulation-tables-seed-iso46001';
import { Q } from '../regulation-tables-quotes-iso46001';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain, gateReaders } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/iso46001.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'ISO-46001';
const rule = (ws: string, sym: string, visible_when: string) => ({ standard: STD, worksheet: ws, symbol: sym, widget: 'scalar' as const, ui_config: null, visible_when, verification_quote: 'q' });
const REGISTERS = ['ISO-46001-01 interested_parties_46001', 'ISO-46001-03 objectives', 'ISO-46001-03 legal_requirements', 'ISO-46001-04 water_sources_46001', 'ISO-46001-04 significant_uses', 'ISO-46001-04 indicators_46001', 'ISO-46001-05 targets', 'ISO-46001-08 water_streams', 'ISO-46001-10 nonconformities'];

describe('ISO-46001 field configs (Plan 3 Task 22)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; no column keyed id; create descriptions carry the rollback selector; created symbols are absent from prod, UPDATE symbols present; no section rules', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      if (e.create) {
        expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
        expect(`${e.worksheet} ${e.create.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create.section_code}`).toBe(true);
        expect(priorRow(`${e.worksheet} ${e.symbol}`), `${e.symbol} must not exist in prod`).toBeUndefined();
      } else {
        expect(priorRow(`${e.worksheet} ${e.symbol}`), `${e.symbol} must exist in prod`).toBeDefined();
      }
      if (e.widget === 'register') {
        const cfg = e.ui_config as RegisterUiConfig;
        for (const c of cfg.columns) {
          expect(c.key, `${e.symbol} column keyed id`).not.toBe('id'); // amendment P
          if (c.expr) expect(parseNumeric(c.expr).ok, `${e.symbol}.${c.key} expr`).toBe(true);
          if (c.visible_when) expect(parseCondition(c.visible_when), `${e.symbol}.${c.key} visible_when`).not.toBeNull();
          if (c.type === 'enum') expect((c.options ?? []).length, `${e.symbol}.${c.key} options`).toBeGreaterThan(0);
        }
        expect(cfg.override).toBeUndefined(); // no lookup column on any register — no override block
        expect(cfg.note).not.toContain('undefined');
      }
    }
    expect(SECTION_VISIBILITY).toEqual([]);
  });

  it('counts: 37 entries = 35 create (9 registers, 20 derived outputs, 1 select_one, 1 lookup_fill, 1 select_many, 2 attestation booleans, 1 text note) + 2 UPDATE rules (procurement_criteria / supplier_informed ← procurement_significant)', () => {
    expect(FIELD_CONFIGS).toHaveLength(37);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(35);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(REGISTERS);
    expect(byWidget('derived')).toHaveLength(20);
    expect(byWidget('select_one')).toEqual(['ISO-46001-04 industry_sector']);
    expect(byWidget('lookup_fill')).toEqual(['ISO-46001-04 business_activity_indicator_hint']);
    expect(byWidget('select_many')).toEqual(['ISO-46001-09 monitoring_items']);
    expect(byWidget('attestation')).toEqual(['ISO-46001-07 designing_new_facilities', 'ISO-46001-07 procurement_significant']);
    expect(byWidget('scalar')).toEqual(['ISO-46001-04 baseline_adjustment_note', 'ISO-46001-07 procurement_criteria', 'ISO-46001-07 supplier_informed']);
    const vis = FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`);
    expect(vis).toEqual([
      `ISO-46001-04 baseline_adjustment_note :: ${BASELINE_TRIGGERED}`,
      `ISO-46001-07 procurement_criteria :: ${PROCURING}`,
      `ISO-46001-07 supplier_informed :: ${PROCURING}`,
    ]);
    // the drivers: the prod enum on -04 (own worksheet, single select today — S-1 stages the multi-select), the created booleans on -07
    expect(priorRow('ISO-46001-04 baseline_adjustment_trigger')).toMatchObject({ data_type: 'enum', consumer_worksheets: null });
    expect((priorRow('ISO-46001-04 baseline_adjustment_trigger').enum_values as Array<{ value: string }>).map((v) => v.value)).toEqual(['indicator_no_longer_reflects', 'process_change', 'method_variation']);
    expect(byKey('ISO-46001-07', 'procurement_significant').create).toMatchObject({ section_code: 'E', data_type: 'boolean' });
    expect(byKey('ISO-46001-07', 'designing_new_facilities').create).toMatchObject({ section_code: 'D', data_type: 'boolean' });
    for (const s of ['procurement_criteria', 'supplier_informed']) expect(priorRow(`ISO-46001-07 ${s}`)).toMatchObject({ section_code: 'E', consumer_worksheets: null }); // the brief's "-06" is refuted by the capture: both live on -07 E
    // every derived output is the output of exactly one equation on the same worksheet, and every footer symbol is such an output
    const outputs = new Map(EQUATIONS.map((e) => [`${e.worksheet} ${e.output_symbol}`, e.equation_number]));
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'derived')) expect(outputs.has(`${e.worksheet} ${e.symbol}`), `${e.symbol} equation`).toBe(true);
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'register')) for (const f of (e.ui_config as RegisterUiConfig).footer ?? []) expect(outputs.has(`${e.worksheet} ${f}`), `${e.symbol} footer ${f}`).toBe(true);
    expect(outputs.size).toBe(20);
  });

  it('G-A3 + printed lists: industry_sector offers exactly the TABLED1 keys (1 today); the lookup_fill keys TABLED1 by sector; stream roles = the Annex-C symbols with their printed legends; output classes / source kinds / §9.1 items / indicator examples are printed', () => {
    expect(INDUSTRY_SECTORS.map((v) => v.value)).toEqual(tableD1AsTable().rows.map((r) => r.keys.sector));
    expect(INDUSTRY_SECTORS).toEqual([{ value: 'wafer_fabrication', label_de: 'Wafer fabrication', order_index: 0 }]);
    expect(byKey('ISO-46001-04', 'industry_sector').enum_values).toEqual(INDUSTRY_SECTORS);
    const lf = byKey('ISO-46001-04', 'business_activity_indicator_hint');
    expect(lf.lookup).toEqual({ table_code: 'TABLED1', role: 'value', keys: [{ column: 'sector', from_symbol: 'industry_sector' }], value: 'indicator_text' });
    expect(tableD1AsTable().key_columns).toEqual(['sector']);
    expect(tableD1AsTable().value_columns.map((c) => c.name)).toContain('indicator_text');
    expect(lf.create).toMatchObject({ data_type: 'text', section_code: 'D' }); // lookup_fill data_type rule (number | text | enum)
    expect(priorRow('ISO-46001-04 business_activity_indicator')).toMatchObject({ data_type: 'text', consumer_worksheets: ['ISO-46001-08', 'ISO-46001-09'] }); // consumed ⇒ twin, never a re-bind (amendment J, D-10)
    // roles: the printed legends of C.1 / C.3 / C.5; WD / R / O are printed in C.2 only (J-1)
    const ws = registerCfg('ISO-46001-08', 'water_streams').columns;
    const role = ws.find((c) => c.key === 'role')!;
    expect(role).toMatchObject({ type: 'enum', required: true, discriminator: true, options: [...STREAM_ROLES] });
    expect(role.option_labels).toEqual(STREAM_ROLE_LABELS);
    expect(collapse(Q.L1126_1129)).toContain('WD + R1 + R2 + R3 = O1 + O2 + O3 + O4');
    expect(collapse(Q.L1144_1150)).toContain('Rp is total reused/recycled water from the process; Rnp is total reused/recycled water not from the process;');
    expect(collapse(Q.L1160_1166)).toContain('Rp is total reused/recycled water from the process; Wp is incoming water to process; Rpp is reused/ recycled water from process back to process.');
    expect(collapse(Q.L1106_1114)).toContain('Win is total water input; Wout is total water output.');
    expect(collapse(Q.L1082_1086)).toContain('a) water supplied by a water utility to the site;');
    expect(collapse(Q.L1082_1086)).toContain('b) other water sources (e.g. sea water, demineralised water, ground water, reclaimed water, rain water).');
    expect(collapse(Q.L1126_1129)).not.toMatch(/WD is|R1 is|O1 is/); // no legend for WD / R / O in the transcript (Figure C.1 is an image; its key prints AHU / WWTP only)
    expect(collapse(Q.L1126_1129)).toContain('Key AHU air handling unit WWTP wastewater treatment plant');
    expect(collapse(Q.L1152_1158)).toContain('P1 + P2 + R1 + R2 + R3 + R4 + WD'); // C.4 prints R1 … R4 as recycled streams of Figure C.2 (J-1)
    for (const t of OUTPUT_TYPES) expect(collapse(Q.L1088_1098), t).toContain(OUTPUT_TYPE_LABELS[t]);
    expect(ws.find((c) => c.key === 'output_type')).toMatchObject({ type: 'enum', options: [...OUTPUT_TYPES], visible_when: OUTPUT_ROLE });
    expect(ws.find((c) => c.key === 'source_kind')).toMatchObject({ type: 'text', datalist: [...SOURCE_KINDS], visible_when: INPUT_ROLE });
    for (const k of SOURCE_KINDS) expect(collapse(Q.L1082_1086) + ' ' + collapse(Q.L801), k).toContain(k);
    expect(collapse(Q.L801)).toContain('Alternative water sources may include but not be limited to reclaimed water, grey water, rain water and sea water.');
    expect(ws.find((c) => c.key === 'meter_verified_on')).toMatchObject({ type: 'date' });
    expect(collapse(Q.L1100_1104)).toContain('ii) locations of water meters.');
    expect(collapse(Q.L876)).toContain('For water meters, the organization should ensure that verification/validation tests are carried out periodically');
    expect(ws.find((c) => c.key === 'balance_term')?.expr).toBe(BALANCE_TERM_EXPR);
    expect(ws.map((c) => c.key)).toEqual(['label', 'role', 'volume_m3', 'period', 'source_kind', 'output_type', 'meter_location', 'meter_verified_on', 'balance_term']);
    // -04 water_sources_46001: the printed a) / b) pair as enum; the kinds as a datalist
    const src = registerCfg('ISO-46001-04', 'water_sources_46001').columns;
    expect(src.find((c) => c.key === 'source_class')).toMatchObject({ type: 'enum', options: [...SOURCE_CLASSES] });
    for (const k of SOURCE_CLASSES) expect(collapse(Q.L1082_1086), k).toContain(SOURCE_CLASS_LABELS[k]);
    expect(priorRow('ISO-46001-04 water_sources')).toMatchObject({ data_type: 'text' }); // the prod text field — the register needed its own symbol (D-8)
    // §9.1: the seven printed minimum items
    expect(MONITORING_ITEMS).toHaveLength(7);
    for (const m of MONITORING_ITEMS) expect(collapse(Q.L660_671) + ' ' + collapse(Q.L681), m.value).toContain(m.label_de);
    expect(collapse(Q.L660_671)).toContain('As a minimum, the water use shall be metered.');
    expect(collapse(Q.L660_671)).toContain('1) monitor and measure as a minimum:');
    expect(byKey('ISO-46001-09', 'monitoring_items').enum_values).toHaveLength(7);
    expect(byKey('ISO-46001-09', 'monitoring_items').create).toMatchObject({ data_type: 'json', section_code: 'C' });
    // significant_uses.activity datalist = the 24 distinct Table A.1 areas; indicators datalist = §3.4 EXAMPLE + the seeded D.1 row
    expect(registerCfg('ISO-46001-04', 'significant_uses').columns.find((c) => c.key === 'activity')?.datalist).toEqual([...TABLEA1_AREA_DATALIST]);
    expect(tableA1AsTable().rows).toHaveLength(39);
    expect([...INDICATOR_DATALIST]).toEqual(['Quantity of products produced', 'number of staff and visitors', 'number of guestrooms', 'Number of units produced']);
    expect(collapse(Q.L254_256)).toContain('EXAMPLE Quantity of products produced, number of staff and visitors, number of guestrooms.');
    // §3.33 per row; the baseline difference in words only (J-3)
    const ind = registerCfg('ISO-46001-04', 'indicators_46001').columns;
    expect(ind.find((c) => c.key === 'value')?.expr).toBe(INDICATOR_VALUE_EXPR);
    expect(ind.find((c) => c.key === 'delta_vs_baseline')?.expr).toBe(DELTA_VS_BASELINE_EXPR);
    expect(collapse(Q.L393_394)).toContain('3.33 water efficiency indicator amount of water used per unit of business activity indicator (3.4)');
    expect(collapse(Q.L551_557)).toContain('Changes in water efficiency performance shall be measured against the baseline water efficiency indicator(s).');
    expect(collapse(Q.L551_557)).toContain('Adjustments to the baseline(s) shall be made in the case of one or more of the following:');
    // targets: a row is complete only with its time frame (§6.3 "Time frames shall be established")
    expect(registerCfg('ISO-46001-05', 'targets').columns.find((c) => c.key === 'time_frame')).toMatchObject({ required: true });
    expect(collapse(Q.L559_561)).toContain('Time frames shall be established for achievement of the targets.');
    expect(collapse(Q.L570_572)).toContain('1) the designation of responsibility; 2) the means and time frame by which individual targets are to be achieved; 3) the method by which an improvement in water efficiency performance shall be verified; 4) the method of verifying the results.');
    // column keys never shadow a prod symbol of the register's worksheet
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'register')) {
      const symbols = Object.keys(prior).filter((k) => k.startsWith(`${e.worksheet} `)).map((k) => k.slice(e.worksheet.length + 1));
      for (const c of (e.ui_config as RegisterUiConfig).columns) expect(symbols, `${e.symbol}.${c.key}`).not.toContain(c.key);
    }
  });

  it('quoted literals: no literal in any row expression / row rule / equation formula equals a register column key or a prod symbol of that worksheet (case-sensitive — the role tokens are lower-case twins of WD / Rp / Rnp / Wp / Rpp)', () => {
    const lits = (src: string) => [...src.matchAll(/(?:==|!=)\s*'([^']+)'|IN \{([^}]+)\}/g)].flatMap((m) => (m[1] ? [m[1]] : m[2].split(',').map((s) => s.trim().replace(/^'|'$/g, ''))));
    let walked = 0;
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'register')) {
      const cols = (e.ui_config as RegisterUiConfig).columns;
      const keys = cols.map((c) => c.key);
      const symbols = Object.keys(prior).filter((k) => k.startsWith(`${e.worksheet} `)).map((k) => k.slice(e.worksheet.length + 1));
      for (const src of cols.flatMap((c) => [c.expr, c.visible_when]).filter((s): s is string => !!s)) {
        walked++;
        for (const l of lits(src)) { expect(keys, `${e.symbol}: '${l}'`).not.toContain(l); expect(symbols, `${e.symbol}: '${l}'`).not.toContain(l); }
      }
    }
    for (const q of EQUATIONS) {
      walked++;
      const reg = FIELD_CONFIGS.find((f) => f.worksheet === q.worksheet && f.symbol === q.input_symbols[0] && f.widget === 'register');
      const keys = reg ? (reg.ui_config as RegisterUiConfig).columns.map((c) => c.key) : [];
      const symbols = Object.keys(prior).filter((k) => k.startsWith(`${q.worksheet} `)).map((k) => k.slice(q.worksheet.length + 1));
      for (const l of lits(q.formula)) { expect(keys, `${q.equation_number}: '${l}'`).not.toContain(l); expect(symbols, `${q.equation_number}: '${l}'`).not.toContain(l); }
    }
    expect(walked).toBe(5 + 20); // 5 column exprs / row rules (water_streams 1 expr + 2 rules, indicators 2 exprs) + 20 formulas
    expect(Object.keys(prior).filter((k) => k.startsWith('ISO-46001-08 ')).map((k) => k.slice(13))).toEqual(expect.arrayContaining(['WD', 'R1', 'O1', 'Rp', 'Rnp', 'Wp', 'Rpp', 'Win', 'Wout']));
  });

  it('the refused / withheld rules are asserted through the guards: design_consideration ← CR-027 (G-1), the -08 rates / Win consumed (R-1), the three empty gates never refuse (G-3), the emitted -07 rules read no gate; no self-consumer entries; the 40 amendment-K pairs exist in the capture', () => {
    expect(gateReaders(prior, 'ISO-46001-07', 'design_consideration', DESIGNING).map((g) => g.code)).toEqual(['CR-027']);
    expect(() => emitFieldConfigSql('iso46001', [rule('ISO-46001-07', 'design_consideration', DESIGNING)], [], prior)).toThrow(/read by gate CR-027/);
    expect(prior.gates!['ISO-46001-07 CR-027']).toMatchObject({ condition: 'design_consideration == true', severity: 'block' });
    expect(gateReaders(prior, 'ISO-46001-07', 'procurement_criteria', PROCURING)).toEqual([]);
    expect(gateReaders(prior, 'ISO-46001-07', 'supplier_informed', PROCURING)).toEqual([]);
    expect(prior.gates!['ISO-46001-06 CR-028']).toMatchObject({ condition: 'attest_iso_46001_06_cr_028 == True', severity: 'block' }); // the §8.3 attestation sits on -06 → G-2 + C-1
    expect(priorRow('ISO-46001-08 plant_recycling_rate').consumer_worksheets).toEqual(['ISO-46001-04', 'ISO-46001-05']);
    expect(() => emitFieldConfigSql('iso46001', [rule('ISO-46001-08', 'plant_recycling_rate', 'recycling_streams_count >= 1')], [], prior)).toThrow(/consumed/);
    expect(gateReaders(prior, 'ISO-46001-08', 'Rp', 'recycling_streams_count >= 1').map((g) => g.code)).toEqual(['CR-038']); // through C.3 / C.5 (chain readers)
    expect(producerChain(prior, 'ISO-46001-08', 'WD')).toMatch(/Win/);
    expect(() => emitFieldConfigSql('iso46001', [rule('ISO-46001-08', 'WD', 'water_streams_count == 0')], [], prior)).toThrow(/hides WD → C\.1 Win \(consumed by ISO-46001-09\)/);
    expect(prior.gates!['ISO-46001-08 CR-037']).toMatchObject({ condition: 'Win == Wout', severity: 'warn' });
    expect(prior.gates!['ISO-46001-08 CR-038']).toMatchObject({ condition: 'plant_recycling_rate >= 0 AND process_recycling_rate >= 0', severity: 'warn' });
    expect(prior.gates!['ISO-46001-04 CR-017']).toMatchObject({ condition: 'water_efficiency_indicator >= 0', severity: 'block' });
    expect(prior.gates!['ISO-46001-04 CR-018']).toMatchObject({ condition: 'baseline_water_efficiency_indicator >= 0', severity: 'block' });
    expect(gateReaders(prior, 'ISO-46001-04', 'baseline_adjustment_note', BASELINE_TRIGGERED)).toEqual([]);
    for (const k of ['ISO-46001-09 CR-036', 'ISO-46001-09 CR-039', 'ISO-46001-01 CR-040']) expect(prior.gates![k]).toMatchObject({ condition: '', parse_error: true });
    for (const [k, r] of Object.entries(prior)) {
      if (!k.includes(' ') || ['sections', 'equations', 'gates', '_meta'].includes(k)) continue;
      expect((r as Row).consumer_worksheets ?? [], k).not.toContain(k.split(' ')[0]);
    }
    // the four prod equations stay (twins only)
    expect(Object.keys(prior.equations!).sort()).toEqual(['ISO-46001-08 C.1', 'ISO-46001-08 C.2b', 'ISO-46001-08 C.3', 'ISO-46001-08 C.5']);
    // amendment-K pairs: register columns / twins that mirror a prod scalar (one D-block each — 40)
    const PAIRS: Array<[string, string, string]> = [
      ['ISO-46001-08', 'water_streams (role wd)', 'WD'], ['ISO-46001-08', 'water_streams (role r_other_source)', 'R1'], ['ISO-46001-08', 'water_streams (role r_other_source)', 'R2'], ['ISO-46001-08', 'water_streams (role r_other_source)', 'R3'],
      ['ISO-46001-08', 'water_streams (role output)', 'O1'], ['ISO-46001-08', 'water_streams (role output)', 'O2'], ['ISO-46001-08', 'water_streams (role output)', 'O3'], ['ISO-46001-08', 'water_streams (role output)', 'O4'],
      ['ISO-46001-08', 'water_streams (role rp)', 'Rp'], ['ISO-46001-08', 'water_streams (role rnp)', 'Rnp'], ['ISO-46001-08', 'water_streams (role wp)', 'Wp'], ['ISO-46001-08', 'water_streams (role rpp)', 'Rpp'],
      ['ISO-46001-08', 'Win_calc (twin)', 'Win'], ['ISO-46001-08', 'Wout_calc (twin)', 'Wout'], ['ISO-46001-08', 'plant_recycling_rate_calc (twin)', 'plant_recycling_rate'], ['ISO-46001-08', 'process_recycling_rate_calc (twin)', 'process_recycling_rate'],
      ['ISO-46001-03', 'objectives (rows)', 'water_efficiency_objectives'], ['ISO-46001-03', 'objectives.what', 'objective_action_what'], ['ISO-46001-03', 'objectives.resources', 'objective_resources'], ['ISO-46001-03', 'objectives.responsible', 'objective_responsible'], ['ISO-46001-03', 'objectives.deadline', 'objective_deadline'], ['ISO-46001-03', 'objectives.evaluation_method', 'objective_evaluation_method'],
      ['ISO-46001-03', 'legal_requirements (rows)', 'legal_other_requirements'],
      ['ISO-46001-04', 'water_sources_46001 (rows)', 'water_sources'], ['ISO-46001-04', 'significant_uses (rows)', 'significant_water_use'],
      ['ISO-46001-04', 'business_activity_indicator_hint (twin) / indicators_46001.indicator', 'business_activity_indicator'], ['ISO-46001-04', 'indicators_46001.activity_value', 'business_activity_indicator_value'], ['ISO-46001-04', 'indicators_46001.period', 'data_period'],
      ['ISO-46001-04', 'water_efficiency_indicator_calc (twin) / indicators_46001.value', 'water_efficiency_indicator'], ['ISO-46001-04', 'indicators_46001.baseline', 'baseline_water_efficiency_indicator'], ['ISO-46001-04', 'Win_calc (-08) / indicators_46001.water_used_m3', 'past_present_water_use'],
      ['ISO-46001-05', 'targets.target', 'water_efficiency_target'], ['ISO-46001-05', 'targets.time_frame', 'target_time_frame'], ['ISO-46001-05', 'targets.means', 'action_plan'], ['ISO-46001-05', 'targets.improvement_verification', 'improvement_verification_method'],
      ['ISO-46001-01', 'interested_parties_46001.party', 'interested_parties'], ['ISO-46001-01', 'interested_parties_46001.requirement', 'interested_party_requirements'],
      ['ISO-46001-09', 'monitoring_items', 'monitoring_breakdown'],
      ['ISO-46001-10', 'nonconformities.nc', 'nonconformity'], ['ISO-46001-10', 'nonconformities.action', 'corrective_action'],
    ];
    expect(PAIRS).toHaveLength(40);
    for (const [ws, , sym] of PAIRS) expect(priorRow(`${ws} ${sym}`), `${ws} ${sym}`).toBeDefined();
    expect(new Set(PAIRS.map(([ws, , s]) => `${ws} ${s}`)).size).toBe(40);
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin, default refuse mode, no warnings): 35 INSERT … WHERE NOT EXISTS + 2 UPDATE fields, 0 section updates, no enum_values write on an UPDATE (D-1)', () => {
    const { up, down, warnings } = emitFieldConfigSql('iso46001', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('iso46001', '20260917102210');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(2);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(35);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
    expect(up).toContain("visible_when = 'procurement_significant == true'");
  });
});
