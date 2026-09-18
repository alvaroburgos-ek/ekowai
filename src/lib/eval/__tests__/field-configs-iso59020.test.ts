/**
 * Plan 3 Task 21 — ISO-59020 field configs: every entry parses through the
 * zod contract, the key-string equality rule (G-A3) holds against the captured
 * prod enums and the seeded TABLE3, the one visibility rule's driver is
 * inherited on its worksheet, every refusal that went to STAGED / the sheet is
 * asserted through the emitter's own guards (not discovered), the amendment-K
 * pairs are counted, no quoted literal collides with a column key or a prod
 * symbol, and the committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FIELD_CONFIGS, SECTION_VISIBILITY, SHORTENED, TRACEABLE, NOT_APPLICABLE, ENERGY_UNITS, DATA_ORIGIN, DATA_SCOPE, DATA_SPECIFICITY, COMPLEMENTARY_METHODS, ADDITIONAL_INDICATORS_B1,
  PCT_ECONRE_EXPR, MANDATORY_FLAG_EXPR, CATEGORY_CODE_EXPR, UNIT_OK_EXPR,
} from '../field-configs/iso59020';
import { EQUATIONS } from '../equations/iso59020';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { table3AsTable, CATEGORY_TOKENS } from '../regulation-tables-seed-iso59020';
import { Q } from '../regulation-tables-quotes-iso59020';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain, gateReaders } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/iso59020.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'ISO-59020';
const rule = (ws: string, sym: string, visible_when: string) => ({ standard: STD, worksheet: ws, symbol: sym, widget: 'scalar' as const, ui_config: null, visible_when, verification_quote: 'q' });
const REGISTERS = ['ISO-59020-04 indicators', 'ISO-59020-04 additional_indicators', 'ISO-59020-05 inflows', 'ISO-59020-06 outflows', 'ISO-59020-07 energy_flows', 'ISO-59020-08 data_sources', 'ISO-59020-09 complementary_methods'];

describe('ISO-59020 field configs (Plan 3 Task 21)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; no section rules', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      expect(e.create, `${e.symbol} is a create`).toBeDefined();
      expect(e.create!.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      expect(e.verification_quote).not.toContain('undefined');
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
      expect(priorRow(`${e.worksheet} ${e.symbol}`), `${e.symbol} must not exist in prod`).toBeUndefined();
      if (e.widget === 'register') {
        const cfg = e.ui_config as RegisterUiConfig;
        for (const c of cfg.columns) {
          expect(c.key, `${e.symbol} column keyed id`).not.toBe('id'); // amendment P
          if (c.expr) expect(parseNumeric(c.expr).ok, `${e.symbol}.${c.key} expr`).toBe(true);
          if (c.visible_when) expect(parseCondition(c.visible_when), `${e.symbol}.${c.key} visible_when`).not.toBeNull();
        }
        expect(cfg.override).toBeUndefined(); // TABLE3 is locked; no override block anywhere
        expect(cfg.note).not.toContain('undefined');
      }
    }
    expect(SECTION_VISIBILITY).toEqual([]);
  });

  it('counts: 46 entries, ALL create (7 registers, 38 derived outputs, 1 text input — the nine Σ/Σ aggregates withheld, J-1); exactly one visibility rule (temporal_boundary_note ← temporal_boundary_shortened, inherited on -09)', () => {
    expect(FIELD_CONFIGS).toHaveLength(46);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(REGISTERS);
    expect(byWidget('derived')).toHaveLength(38);
    expect(byWidget('scalar')).toEqual(['ISO-59020-09 temporal_boundary_note']);
    expect(byWidget('select_one')).toEqual([]);
    expect(byWidget('select_many')).toEqual([]);
    expect(byWidget('lookup_fill')).toEqual([]);
    const vis = FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`);
    expect(vis).toEqual([`ISO-59020-09 temporal_boundary_note :: ${SHORTENED}`]);
    expect(priorRow('ISO-59020-03 temporal_boundary_shortened')).toMatchObject({ data_type: 'boolean', consumer_worksheets: ['ISO-59020-09'] });
    expect(byKey('ISO-59020-09', 'temporal_boundary_note').create).toMatchObject({ section_code: 'G', data_type: 'text' });
    // every derived output is the output of exactly one equation on the same worksheet, and every footer symbol is such an output
    const outputs = new Map(EQUATIONS.map((e) => [`${e.worksheet} ${e.output_symbol}`, e.equation_number]));
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'derived')) expect(outputs.has(`${e.worksheet} ${e.symbol}`), `${e.symbol} equation`).toBe(true);
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'register')) for (const f of (e.ui_config as RegisterUiConfig).footer ?? []) expect(outputs.has(`${e.worksheet} ${f}`), `${e.symbol} footer ${f}`).toBe(true);
    expect(outputs.size).toBe(38);
  });

  it('G-A3 key-string equality: TABLE3 keys = the captured selected_core_indicator enum values; category tokens = indicator_category; energy units = energy_unit_common; the data-source pairs are the data_category tokens split by the printed §7.6.2 axes (J-4)', () => {
    expect(table3AsTable().rows.map((r) => r.keys.indicator)).toEqual(enumValues('ISO-59020-04 selected_core_indicator'));
    expect(Object.values(CATEGORY_TOKENS)).toEqual(enumValues('ISO-59020-04 indicator_category'));
    expect([...ENERGY_UNITS]).toEqual(enumValues('ISO-59020-07 energy_unit_common'));
    expect(registerCfg('ISO-59020-07', 'energy_flows').columns.find((c) => c.key === 'unit')?.options).toEqual([...ENERGY_UNITS]);
    expect([...DATA_ORIGIN, ...DATA_SCOPE, ...DATA_SPECIFICITY].sort()).toEqual([...enumValues('ISO-59020-08 data_category')].sort());
    const ds = registerCfg('ISO-59020-08', 'data_sources').columns;
    expect(ds.find((c) => c.key === 'origin')).toMatchObject({ required: true, options: ['primary', 'secondary'] });
    expect(ds.find((c) => c.key === 'scope')).toMatchObject({ required: true, options: ['foreground', 'background'] });
    expect(ds.find((c) => c.key === 'specificity')).toMatchObject({ required: true, options: ['specific', 'generic'] });
    // the indicators register: lookup_key on TABLE3 (grouped by the printed category), the printed-string mandatory flag, the category token via lookup()
    const ind = registerCfg('ISO-59020-04', 'indicators').columns;
    expect(ind.find((c) => c.key === 'indicator')).toMatchObject({ type: 'lookup_key', required: true, lookup: { table_code: 'TABLE3', group_by: 'category' } });
    for (const k of ['category', 'mandatory_optional', 'principle']) expect(ind.find((c) => c.key === k)).toMatchObject({ type: 'lookup_value', lookup: { table_code: 'TABLE3', key_column: 'indicator', value: k } });
    expect(ind.find((c) => c.key === 'mandatory_flag')?.expr).toBe(MANDATORY_FLAG_EXPR);
    expect(ind.find((c) => c.key === 'category_code')?.expr).toBe(CATEGORY_CODE_EXPR);
    expect(ind.find((c) => c.key === 'justification')?.visible_when).toBe(NOT_APPLICABLE);
    expect(ind.find((c) => c.key === 'selected')?.type).toBe('boolean');
    expect(ind.find((c) => c.key === 'not_applicable')?.type).toBe('boolean');
    // datalists are the printed lists (Annex C standards open their bullet lines; Table B.1 rows)
    for (const m of COMPLEMENTARY_METHODS.slice(0, 17)) expect(Object.values(Q).some((s) => s.replace(/\s+/g, ' ').includes(`— ${m} `)), m).toBe(true);
    expect(Q.L3205_3206).toContain('Social life cycle assessment (S-LCA)');
    expect(Q.L3213).toContain('Life cycle sustainability assessment (LCSA)');
    expect(registerCfg('ISO-59020-09', 'complementary_methods').columns.find((c) => c.key === 'method')?.datalist).toEqual([...COMPLEMENTARY_METHODS]);
    expect(registerCfg('ISO-59020-04', 'additional_indicators').columns.find((c) => c.key === 'name')?.datalist).toEqual([...ADDITIONAL_INDICATORS_B1]);
    const b1 = Q.L2545_2567.replace(/\s+/g, ' ');
    for (const f of ['B.3.2 Per cent designed reusability', 'rate of the outflow', 'B.3.3 Per cent designed recyclabili-', 'ty rate of the outflow', 'B.4.2 Per cent energy recovered', 'B.4.3 Energy intensity', 'B.5.2 Nutrient extraction from', 'discharged water', 'B.5.3 Water intensity', 'B.6.3 Net value added', 'B.6.4 Value per mass', 'B.6.5 Resource productivity', 'B.6.6 Genuine process indicator']) expect(b1, f).toContain(f);
    // §3.3.7 prints the definition only — no example list (the inventory's "§3.3.7 examples" premise is refuted; the datalist comes from Annex C)
    expect(Q.L375_378.replace(/\s+/g, ' ').trim()).toBe('3.3.7 complementary method method, approach or standard that is used together with circularity measurement (3.3.2) to provide a circularity assessment (3.3.3)');
  });

  it('registers: the per-row Annex-A formulae (A.1 – A.8) live as derived columns; mRECO is hidden per row unless traceable (A.3.4); the energy unit badge reads the worksheet scalar energy_unit_common (own worksheet, G-13); no column keyed like a prod symbol of its worksheet', () => {
    const inf = registerCfg('ISO-59020-05', 'inflows').columns;
    expect(inf.map((c) => c.key)).toEqual(['label', 'm_ti', 'm_reui', 'm_reci', 'm_reni', 'pct_reui', 'pct_reci', 'pct_reni', 'pct_linear', 'm_linear', 'balanced']);
    for (const k of ['m_ti', 'm_reui', 'm_reci', 'm_reni']) expect(inf.find((c) => c.key === k)).toMatchObject({ required: true, min: 0, unit: 'kg' });
    const out = registerCfg('ISO-59020-06', 'outflows').columns;
    expect(out.find((c) => c.key === 'm_reco')).toMatchObject({ required: true, visible_when: TRACEABLE });
    expect(out.find((c) => c.key === 'traceable_recycling')).toMatchObject({ type: 'boolean', discriminator: true });
    for (const k of ['t_lp', 't_ialp']) expect(out.find((c) => c.key === k)?.required, k).toBeUndefined(); // A.3.2 is optional
    const en = registerCfg('ISO-59020-07', 'energy_flows').columns;
    expect(en.find((c) => c.key === 'pct_econre')?.expr).toBe(PCT_ECONRE_EXPR);
    expect(en.find((c) => c.key === 'unit_ok')?.expr).toBe(UNIT_OK_EXPR);
    expect(priorRow('ISO-59020-07 energy_unit_common')).toMatchObject({ data_type: 'enum', consumer_worksheets: null }); // own worksheet, not inherited anywhere — resolves on -07
    // column keys never shadow a prod symbol of the register's worksheet (a row key shadows the worksheet symbol in row scope)
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'register')) {
      const symbols = Object.keys(prior).filter((k) => k.startsWith(`${e.worksheet} `)).map((k) => k.slice(e.worksheet.length + 1));
      for (const c of (e.ui_config as RegisterUiConfig).columns) expect(symbols, `${e.symbol}.${c.key}`).not.toContain(c.key);
    }
  });

  it('quoted literals: no literal in any row expression / row rule / equation formula equals a register column key or a prod symbol of that worksheet (Task 13b lint pinned; the emitters print no warning)', () => {
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
      const reg = registerCfg(q.worksheet, q.input_symbols[0]).columns.map((c) => c.key);
      const symbols = Object.keys(prior).filter((k) => k.startsWith(`${q.worksheet} `)).map((k) => k.slice(q.worksheet.length + 1));
      for (const l of lits(q.formula)) { expect(reg, `${q.equation_number}: '${l}'`).not.toContain(l); expect(symbols, `${q.equation_number}: '${l}'`).not.toContain(l); }
    }
    expect(walked).toBe(23 + 38); // 23 column exprs / row rules (inflows 6, outflows 7 + 1 rule, energy 3, indicators 4 + 1 rule, data_sources 1) + 38 formulas
  });

  it('the refused / withheld rules are asserted through the guards: information_verifiable ← CR-035 (J-5), aggregation_method consumed (J-6), the -05 / -06 / -07 single-X scalars gate-read and producer-chained (R-1), mandatory_core_indicators_included ← CR-009 + consumed (G-4); no self-consumer entries; the ALL / range tokens', () => {
    const EXTERNAL = "internal_or_external_use == 'external_communication'";
    expect(gateReaders(prior, 'ISO-59020-09', 'information_verifiable', EXTERNAL).map((g) => g.code)).toEqual(['CR-035']);
    expect(() => emitFieldConfigSql('iso59020', [rule('ISO-59020-09', 'information_verifiable', EXTERNAL)], [], prior)).toThrow(/read by gate CR-035/);
    expect(priorRow('ISO-59020-04 aggregation_method').consumer_worksheets).toEqual(['ISO-59020-05', 'ISO-59020-06', 'ISO-59020-07']);
    expect(() => emitFieldConfigSql('iso59020', [rule('ISO-59020-04', 'aggregation_method', "system_level == 'regional'")], [], prior)).toThrow(/consumed/);
    expect(priorRow('ISO-59020-01 system_level').consumer_worksheets).toEqual(['ALL']); // reaches no worksheet (fll_gar trap 1)
    const SEL = 'inflow_indicators_selected >= 1';
    for (const s of ['mTI_X', 'mREUI_X']) {
      const r = gateReaders(prior, 'ISO-59020-05', s, SEL);
      expect(r.map((g) => g.code), s).toContain('CR-011');
      expect(producerChain(prior, 'ISO-59020-05', s), s).toMatch(/pct_REUI_X/);
    }
    expect(gateReaders(prior, 'ISO-59020-05', 'pct_linear_inflow', SEL).map((g) => g.code)).toEqual(['CR-014']);
    expect(gateReaders(prior, 'ISO-59020-06', 'mTO_X', SEL).map((g) => g.code).sort()).toEqual(['CR-015', 'CR-016', 'CR-017', 'CR-018', 'CR-019']); // direct + through A.5 / A.6 / A.7 → pct_*_X (chain readers, round 4)
    expect(gateReaders(prior, 'ISO-59020-07', 'EIRENE_X', 'energy_indicator_selected >= 1').map((g) => g.code)).toEqual(['CR-020']);
    expect(gateReaders(prior, 'ISO-59020-07', 'VCIW', 'water_indicators_selected >= 1').map((g) => g.code)).toEqual(['CR-021']);
    expect(gateReaders(prior, 'ISO-59020-07', 'C', 'economic_indicators_selected >= 1').map((g) => g.code)).toEqual(['CR-024']);
    // the producer guard speaks first (EIRENE_X → A.8 pct_ECONRE_X consumed by -09); the gate guard (CR-020) is the second refusal — both are R-1 / G-1 / M-1
    expect(() => emitFieldConfigSql('iso59020', [rule('ISO-59020-07', 'EIRENE_X', 'energy_indicator_selected >= 1')], [], prior)).toThrow(/hides EIRENE_X → A\.8 pct_ECONRE_X \(consumed by ISO-59020-09\)/);
    expect(gateReaders(prior, 'ISO-59020-04', 'mandatory_core_indicators_included', SEL).map((g) => g.code)).toEqual(['CR-009']);
    expect(priorRow('ISO-59020-04 mandatory_core_indicators_included').consumer_worksheets).toEqual(['ISO-59020-05', 'ISO-59020-06']);
    // the four empty-condition gates never refuse (round-2 ruling) and are the G-2 targets
    for (const k of ['ISO-59020-03 CR-008', 'ISO-59020-04 CR-010', 'ISO-59020-09 CR-036', 'ISO-59020-09 CR-037']) expect(prior.gates![k]).toMatchObject({ condition: '', parse_error: true });
    expect(gateReaders(prior, 'ISO-59020-09', 'temporal_boundary_note', SHORTENED)).toEqual([]);
    for (const [k, r] of Object.entries(prior)) {
      if (!k.includes(' ') || ['sections', 'equations', 'gates', '_meta'].includes(k)) continue;
      expect((r as Row).consumer_worksheets ?? [], k).not.toContain(k.split(' ')[0]);
    }
    // amendment-K pairs: the register columns that twin a prod scalar (one D-block each — 25)
    const PAIRS: Array<[string, string, string]> = [
      ['ISO-59020-04', 'indicators.indicator', 'selected_core_indicator'], ['ISO-59020-04', 'indicators.category', 'indicator_category'], ['ISO-59020-04', 'indicators.not_applicable / justification', 'indicator_not_applicable_justified'], ['ISO-59020-04', 'mandatory_core_indicators_included_code', 'mandatory_core_indicators_included'], ['ISO-59020-04', 'additional_indicators.name', 'additional_indicator'],
      ['ISO-59020-05', 'inflows.m_ti', 'mTI_X'], ['ISO-59020-05', 'inflows.m_reui', 'mREUI_X'], ['ISO-59020-05', 'inflows.m_reci', 'mRECI_X'], ['ISO-59020-05', 'inflows.m_reni', 'mRENI_X'], ['ISO-59020-05', 'inflows.pct_linear (per row; pct_linear_agg withheld, J-1)', 'pct_linear_inflow'],
      ['ISO-59020-06', 'outflows.m_to', 'mTO_X'], ['ISO-59020-06', 'outflows.m_reuo', 'mREUO_X'], ['ISO-59020-06', 'outflows.m_reco', 'mRECO_X'], ['ISO-59020-06', 'outflows.m_reno', 'mRENO_X'], ['ISO-59020-06', 'outflows.t_lp', 'tLP_X'], ['ISO-59020-06', 'outflows.t_ialp', 'tIALP_X'], ['ISO-59020-06', 'outflows.pct_linear (per row; pct_linear_out_agg withheld, J-1)', 'pct_linear_outflow'],
      ['ISO-59020-07', 'energy_flows.ei_rene', 'EIRENE_X'], ['ISO-59020-07', 'energy_flows.eo_rene', 'EORENE_X'], ['ISO-59020-07', 'energy_flows.ei_te', 'EITE_X'], ['ISO-59020-07', 'energy_flows.eo_te', 'EOTE_X'],
      ['ISO-59020-08', 'data_sources (rows)', 'system_breakdown_done'], ['ISO-59020-08', 'data_sources.origin / scope / specificity', 'data_category'], ['ISO-59020-08', 'data_sources.traceable', 'data_traceability'],
      ['ISO-59020-09', 'complementary_methods.method', 'complementary_method'],
    ];
    expect(PAIRS).toHaveLength(25);
    for (const [ws, , sym] of PAIRS) expect(priorRow(`${ws} ${sym}`), `${ws} ${sym}`).toBeDefined();
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin, default refuse mode, no warnings)', () => {
    const { up, down, warnings } = emitFieldConfigSql('iso59020', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('iso59020', '20260917102110');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(0);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(46);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
  });
});
