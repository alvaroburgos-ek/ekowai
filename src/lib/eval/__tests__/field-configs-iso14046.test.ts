/**
 * Plan 3 Task 26 — ISO-14046 field configs: every entry parses through the zod
 * contract, the key-string equality rule (G-A3 / D-1) holds against the captured
 * prod enums (the register enum columns = prod flow_water_resource_type /
 * flow_form_of_use value + label_de byte-for-byte; every rule literal is a prod
 * token), no register column is keyed `id` or shadows a prod symbol of its
 * worksheet (amendment P), every emitted driver is inherited on its rule's
 * worksheet, the ONE UPDATE on an existing field (review_panel_members) is
 * consumer-free and gate-free, every other brief target is REFUSED by the
 * emitter's own guards (asserted, not discovered: producer chains + gate readers
 * REQ-11 / -13 / -18 / -20 / -22; the -04 sections C / D / E / H), the two withheld
 * hides are ACCEPTED by the emitter (withheld on the transcript's words — J-1 /
 * J-2), the O-1 absences, and the committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FIELD_CONFIGS, SECTION_VISIBILITY, STAGED_SECTION_RULE_04, RESOURCE_TYPES, FORMS_OF_USE, PANEL_REVIEW, THIRD_PARTY, WEIGHTING, BASELINE, ROW_OUTPUT,
  CONTRIBUTION_EXPR, DATA_QUALITY_ITEMS, THIRD_PARTY_ITEMS,
} from '../field-configs/iso14046';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { s5242DqAsTable, s62TpAsTable } from '../regulation-tables-seed-iso14046';
import { Q } from '../regulation-tables-quotes-iso14046';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain, gateReaders } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/iso14046.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string) => (priorRow(key).enum_values as Array<{ value: string; label_de: string }>).map((e) => ({ value: e.value, label_de: e.label_de }));
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'ISO-14046';
const rule = (ws: string, sym: string, visible_when: string) => ({ standard: STD, worksheet: ws, symbol: sym, widget: 'scalar' as const, ui_config: null, visible_when, verification_quote: 'q' });
const prodSymbols = (ws: string) => Object.keys(prior).filter((k) => k.startsWith(`${ws} `)).map((k) => k.slice(ws.length + 1));
const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('ISO-14046 field configs (Plan 3 Task 26)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; no section rules; no register column keyed `id` or shadowing a prod symbol of its worksheet; every quote is a lifted span', () => {
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
    // the register column keys the brief would have collided with (Task 22 trap 4 / amendment P)
    expect(prodSymbols('ISO-14046-04')).toContain('lci_result'); // the column is `lci_value`
    expect(prodSymbols('ISO-14046-04')).toContain('impact_categories'); // the register is `impact_categories_14046`
    expect(prodSymbols('ISO-14046-05')).toContain('significant_issues'); // the register is `significant_issues_14046`
    expect(registerCfg('ISO-14046-04', 'lci_cf_rows').columns.map((c) => c.key)).toEqual(['category', 'flow', 'lci_value', 'cf', 'contribution']);
  });

  it('counts: 26 entries = 25 create (5 registers, 15 derived outputs, 2 select_many, 1 attestation, 2 text) + 1 UPDATE (review_panel_members); the emitted rules and their drivers; the flows register carries one row-scope rule (releases ← output)', () => {
    expect(FIELD_CONFIGS).toHaveLength(26);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual(['ISO-14046-07 review_panel_members']);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['ISO-14046-03 elementary_flows', 'ISO-14046-04 impact_categories_14046', 'ISO-14046-04 lci_cf_rows', 'ISO-14046-05 significant_issues_14046', 'ISO-14046-07 review_panel']);
    expect(byWidget('derived')).toEqual([
      'ISO-14046-03 water_input_total', 'ISO-14046-03 water_output_total', 'ISO-14046-03 water_balance_diff', 'ISO-14046-03 elementary_flow_count',
      ...RESOURCE_TYPES.map((t) => `ISO-14046-03 water_input_${t.value}`),
      'ISO-14046-04 category_indicator_total', 'ISO-14046-05 significant_issues_count',
      'ISO-14046-07 review_panel_members_calc', 'ISO-14046-07 panel_chair_independent', 'ISO-14046-07 panel_min_members_ok',
    ]);
    expect(byWidget('select_many')).toEqual(['ISO-14046-02 data_quality_items', 'ISO-14046-06 third_party_report_items']);
    expect(byWidget('attestation')).toEqual(['ISO-14046-02 baseline_conditions_present']);
    expect(byWidget('scalar')).toEqual(['ISO-14046-02 reference_period_inventory', 'ISO-14046-04 weighting_report_note', 'ISO-14046-07 review_panel_members']);
    expect(byWidget('select_one')).toEqual([]);
    expect(byWidget('lookup_fill')).toEqual([]);
    const vis = FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`);
    expect(vis).toEqual([
      `ISO-14046-02 reference_period_inventory :: ${BASELINE}`,
      `ISO-14046-04 weighting_report_note :: ${WEIGHTING}`,
      `ISO-14046-06 third_party_report_items :: ${THIRD_PARTY}`,
      `ISO-14046-07 review_panel :: ${PANEL_REVIEW}`,
      `ISO-14046-07 review_panel_members_calc :: ${PANEL_REVIEW}`,
      `ISO-14046-07 panel_chair_independent :: ${PANEL_REVIEW}`,
      `ISO-14046-07 panel_min_members_ok :: ${PANEL_REVIEW}`,
      `ISO-14046-07 review_panel_members :: ${PANEL_REVIEW}`,
    ]);
    expect(PANEL_REVIEW).toBe("critical_review_type == 'panel_review'");
    expect(THIRD_PARTY).toBe("report_type == 'third_party'");
    expect(WEIGHTING).toBe('weighting_applied == true');
    expect(BASELINE).toBe('baseline_conditions_present == true');
    // the drivers resolve where the rules live: critical_review_type / report_type (-02) are inherited on -07 / -06; weighting_applied is a -04 field; the baseline driver is created on -02
    expect(priorRow('ISO-14046-02 critical_review_type').consumer_worksheets).toEqual(['ISO-14046-07']);
    expect(priorRow('ISO-14046-02 report_type').consumer_worksheets).toEqual(['ISO-14046-06']);
    expect(priorRow('ISO-14046-04 weighting_applied')).toBeDefined();
    expect(priorRow('ISO-14046-01 study_type').consumer_worksheets).toEqual(['ISO-14046-03', 'ISO-14046-04', 'ISO-14046-06']); // study_type IS inherited on -04 — the section rules are refused for other reasons (below)
    const rowRules = registerCfg('ISO-14046-03', 'elementary_flows').columns.filter((c) => c.visible_when).map((c) => `${c.key} :: ${c.visible_when}`);
    expect(rowRules).toEqual([`releases :: ${ROW_OUTPUT}`]);
    expect(ROW_OUTPUT).toBe("direction == 'output'");
  });

  it('G-A3 / D-1 key-string equality: the register enum columns = the prod flow_water_resource_type / flow_form_of_use lists (value + label_de byte-for-byte — labels EV, E-1); the per-type outputs follow the prod tokens; every rule literal is a prod token; the checklists offer the printed lines of their tables; created fields land in captured sections', () => {
    expect(enumValues('ISO-14046-03 flow_water_resource_type')).toEqual([...RESOURCE_TYPES]);
    expect(enumValues('ISO-14046-03 flow_form_of_use')).toEqual([...FORMS_OF_USE]);
    expect(RESOURCE_TYPES.map((t) => t.value)).toEqual(['rainwater', 'surface_water', 'seawater', 'brackish_water', 'groundwater', 'fossil_water']);
    expect(FORMS_OF_USE.map((t) => t.value)).toEqual(['evaporation', 'transpiration', 'product_integration', 'release_other_watershed_or_sea', 'displacement_between_resources', 'instream_use', 'other']);
    // the printed lists the tokens are matched to (labels are NOT verifiable from the Spanish transcript — E-1)
    expect(Q.L651_657.split('\n')).toEqual(['b) recursos tipo de agua utilizada:', '- pluvial;', '- agua superficial;', '- agua de mar;', '- agua salobre;', '- agua subterránea (excluyendo agua fósil);', '- aguafósil;']);
    expect(Q.L659_665.split('\n')).toHaveLength(7); // d) + six forms incl. "otras formas de uso del agua"
    expect(collapse(Q.L659_665)).toContain('- evaporación; - transpiración; - integración en el producto; - liberación en diferentes cuencas hidrográficas o en el mar; - desplazamiento de agua');
    expect(collapse(Q.L659_665)).toContain('- otras formas de uso del agua;');
    const cols = registerCfg('ISO-14046-03', 'elementary_flows').columns;
    const col = (k: string) => cols.find((c) => c.key === k)!;
    expect(col('resource_type').options).toEqual(RESOURCE_TYPES.map((o) => o.value));
    expect(col('resource_type').option_labels).toEqual(Object.fromEntries(RESOURCE_TYPES.map((o) => [o.value, o.label_de])));
    expect(col('form_of_use').options).toEqual(FORMS_OF_USE.map((o) => o.value));
    expect(col('direction').options).toEqual(['input', 'output']);
    expect(col('direction').discriminator).toBe(true);
    expect(cols.filter((c) => c.required).map((c) => c.key)).toEqual(['unit_process', 'direction', 'quantity_m3', 'resource_type']);
    expect(col('quantity_m3').unit).toBe('m³');
    expect(col('quantity_m3').min).toBe(0);
    // rule literals: prod tokens of the captured enums
    expect(enumValues('ISO-14046-02 critical_review_type').map((e) => e.value)).toContain('panel_review');
    expect(enumValues('ISO-14046-02 report_type').map((e) => e.value)).toContain('third_party');
    expect(enumValues('ISO-14046-01 study_type').map((e) => e.value)).toContain('water_footprint_assessment');
    expect(STAGED_SECTION_RULE_04).toBe("study_type == 'water_footprint_assessment'");
    expect(enumValues('ISO-14046-02 allocation_procedure').map((e) => e.value)).toEqual(['avoided_subdivision', 'avoided_system_expansion', 'physical_relationship', 'other_relationship_economic']);
    // the checklists: values ARE the printed lines (the checklist renders enum_values[].value — m820_2 trap 1)
    expect(DATA_QUALITY_ITEMS.map((m) => m.value)).toEqual(s5242DqAsTable().rows.map((r) => r.label_de));
    expect(DATA_QUALITY_ITEMS).toHaveLength(10);
    expect(DATA_QUALITY_ITEMS[0].value).toBe('a) cobertura relacionada con el tiempo: antigüedad de los datos y período de tiempo mínimo en el que se deberían recopilar los datos;');
    expect(THIRD_PARTY_ITEMS.map((m) => m.value)).toEqual(s62TpAsTable().rows.map((r) => r.label_de));
    expect(THIRD_PARTY_ITEMS).toHaveLength(7);
    expect(THIRD_PARTY_ITEMS[0].value).toBe('a) aspectos generales:');
    const dq = byKey('ISO-14046-02', 'data_quality_items');
    expect((dq.enum_values as Array<{ value: string }>).map((e) => e.value)).toEqual(DATA_QUALITY_ITEMS.map((m) => m.value));
    expect((dq.ui_config as { groups: Array<{ options: string[] }> }).groups[0].options).toEqual(DATA_QUALITY_ITEMS.map((m) => m.value));
    const tp = byKey('ISO-14046-06', 'third_party_report_items');
    expect((tp.enum_values as Array<{ value: string }>).map((e) => e.value)).toEqual(THIRD_PARTY_ITEMS.map((m) => m.value));
    // the created fields' data types / sections (captured section codes)
    expect(byKey('ISO-14046-03', 'elementary_flows').create).toMatchObject({ section_code: 'C', data_type: 'json' });
    expect(byKey('ISO-14046-04', 'impact_categories_14046').create).toMatchObject({ section_code: 'C', data_type: 'json' });
    expect(byKey('ISO-14046-04', 'lci_cf_rows').create).toMatchObject({ section_code: 'E', data_type: 'json' });
    expect(byKey('ISO-14046-05', 'significant_issues_14046').create).toMatchObject({ section_code: 'B', data_type: 'json' });
    expect(byKey('ISO-14046-07', 'review_panel').create).toMatchObject({ section_code: 'E', data_type: 'json' });
    expect(dq.create).toMatchObject({ section_code: 'F', data_type: 'json' });
    expect(tp.create).toMatchObject({ section_code: 'C', data_type: 'json' });
    expect(byKey('ISO-14046-02', 'baseline_conditions_present').create).toMatchObject({ section_code: 'C', data_type: 'boolean' });
    expect(byKey('ISO-14046-02', 'reference_period_inventory').create).toMatchObject({ section_code: 'C', data_type: 'text' });
    expect(byKey('ISO-14046-04', 'weighting_report_note').create).toMatchObject({ section_code: 'H', data_type: 'text' });
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
    for (const e of FIELD_CONFIGS.filter((x) => x.create && x.widget === 'derived')) expect(e.create!.data_type, e.symbol).toBe('number');
    // O-1: the brief's targets weighting_report_note / reference_period_inventory / baseline_conditions_present do not exist in the capture (CREATED here)
    for (const s of ['weighting_report_note', 'reference_period_inventory', 'baseline_conditions_present', 'review_panel', 'elementary_flows', 'lci_cf_rows']) expect(Object.keys(prior).filter((k) => k.endsWith(` ${s}`)), s).toEqual([]);
    expect(priorRow('ISO-14046-02 baseline_conditions')).toMatchObject({ data_type: 'text', consumer_worksheets: ['ISO-14046-03', 'ISO-14046-04'] }); // the text twin of the created driver (D-23)
    expect(priorRow('ISO-14046-07 review_panel_members')).toMatchObject({ data_type: 'number', consumer_worksheets: null });
  });

  it('registers: the per-row EQ-01 product on lci_cf_rows, the typed per-category result (F-1), every footer symbol a created derived output of the same worksheet, no override block (no lookup table), the review panel columns', () => {
    const lci = registerCfg('ISO-14046-04', 'lci_cf_rows');
    expect(lci.columns.find((c) => c.key === 'contribution')!.expr).toBe(CONTRIBUTION_EXPR);
    expect(CONTRIBUTION_EXPR).toBe('lci_value * cf'); // §3.3.14 L325 + prod EQ-01 SUM(lci_result * characterization_factor)
    expect(Q.L325).toContain('Factor que surge de un modelo de caracterización que se aplica para convertir el resultado del análisis del inventario del ciclo de vida (3.3.6) asignado a la unidad común del indicador de categoría');
    expect(prior.equations!['ISO-14046-04 EQ-01']).toMatchObject({ output_symbol: 'category_indicator_result', input_symbols: ['lci_result', 'characterization_factor'] });
    expect(lci.columns.filter((c) => c.required).map((c) => c.key)).toEqual(['category', 'lci_value', 'cf']);
    expect(lci.footer).toEqual(['category_indicator_total']);
    const ic = registerCfg('ISO-14046-04', 'impact_categories_14046');
    expect(ic.columns.map((c) => [c.key, c.type])).toEqual([['category', 'text'], ['indicator_name', 'text'], ['indicator_unit', 'text'], ['model', 'text'], ['result', 'number']]);
    expect(ic.footer).toBeUndefined();
    const si = registerCfg('ISO-14046-05', 'significant_issues_14046');
    expect(si.columns.map((c) => [c.key, c.type])).toEqual([['issue', 'text'], ['contribution_pct', 'number'], ['mechanism', 'text']]);
    expect(si.columns[1]).toMatchObject({ unit: '%', min: 0, max: 100 });
    const rp = registerCfg('ISO-14046-07', 'review_panel');
    expect(rp.columns.map((c) => [c.key, c.type])).toEqual([['name', 'text'], ['affiliation', 'text'], ['independent', 'boolean'], ['chair', 'boolean']]);
    expect(rp.columns.filter((c) => c.required).map((c) => c.key)).toEqual(['name']);
    expect(rp.footer).toEqual(['review_panel_members_calc', 'panel_chair_independent', 'panel_min_members_ok']);
    const flows = registerCfg('ISO-14046-03', 'elementary_flows');
    expect(flows.footer).toEqual(['water_input_total', 'water_output_total', 'water_balance_diff', 'elementary_flow_count']);
    const created = new Set(FIELD_CONFIGS.filter((e) => e.create && e.widget === 'derived').map((e) => `${e.worksheet} ${e.symbol}`));
    for (const [ws, sym] of [['ISO-14046-03', 'elementary_flows'], ['ISO-14046-04', 'lci_cf_rows'], ['ISO-14046-05', 'significant_issues_14046'], ['ISO-14046-07', 'review_panel']]) {
      const cfg = registerCfg(ws, sym);
      for (const f of cfg.footer ?? []) expect(created.has(`${ws} ${f}`), `${sym} footer ${f}`).toBe(true);
      expect(cfg.override).toBeUndefined();
    }
    // no figure typed into any row expr
    for (const [ws, sym] of [['ISO-14046-03', 'elementary_flows'], ['ISO-14046-04', 'lci_cf_rows'], ['ISO-14046-04', 'impact_categories_14046'], ['ISO-14046-05', 'significant_issues_14046'], ['ISO-14046-07', 'review_panel']]) {
      for (const c of registerCfg(ws, sym).columns.filter((x) => x.expr)) expect(c.expr, `${sym}.${c.key}`).not.toMatch(/\b\d+(\.\d+)?\b/);
    }
  });

  it('guards: the one UPDATE is consumer-free and gate-free; every other brief target on an existing field is REFUSED (producer chain / gate readers REQ-13 / REQ-22 / REQ-18 / REQ-20 / REQ-11 → G-4 / G-2 / G-5 / G-6 / G-7); the -04 sections C / D / E / H are refused (G-1, lci_result → EQ-01), the field-less ones would be inert; the two withheld hides are accepted by the emitter (J-1 / J-2); the IF-guard exemption', () => {
    expect(gateReaders(prior, 'ISO-14046-07', 'review_panel_members', PANEL_REVIEW)).toEqual([]);
    expect(producerChain(prior, 'ISO-14046-07', 'review_panel_members')).toBeNull();
    const refused: Array<[string, string, string, string[], RegExp | null]> = [
      ['ISO-14046-01', 'water_footprint_qualifier', 'comprehensive_assessment == false', ['REQ-13'], /water_footprint_qualifier \(consumed by ISO-14046-04, ISO-14046-06\)/],
      ['ISO-14046-02', 'organization_boundary', 'is_organization_assessment == true', ['REQ-22'], /organization_boundary \(consumed by ISO-14046-03\)/],
      ['ISO-14046-01', 'consolidation_method', 'is_organization_assessment == true', [], /consolidation_method \(consumed by ISO-14046-02, ISO-14046-03\)/], // REQ-22 lives on -02 — the producer guard refuses
      ['ISO-14046-06', 'third_party_report', THIRD_PARTY, ['REQ-18'], null],
      ['ISO-14046-07', 'critical_review_performed', 'comparative_assertion_public == true', ['REQ-20'], /critical_review_performed \(consumed by ISO-14046-06\)/],
      ['ISO-14046-03', 'allocation_balance_preserved', "allocation_procedure IN {'physical_relationship', 'other_relationship_economic'}", ['REQ-11'], null],
      ['ISO-14046-03', 'allocation_sensitivity_done', "allocation_procedure IN {'physical_relationship', 'other_relationship_economic'}", ['REQ-11'], null],
    ];
    for (const [ws, sym, vw, gates, chain] of refused) {
      expect(priorRow(`${ws} ${sym}`), `${ws} ${sym} captured`).toBeDefined();
      expect(gateReaders(prior, ws, sym, vw).map((g) => g.code), `${sym} gate readers`).toEqual(gates);
      if (chain) expect(producerChain(prior, ws, sym), `${sym} chain`).toMatch(chain); else expect(producerChain(prior, ws, sym), `${sym} chain`).toBeNull();
      expect(() => emitFieldConfigSql('iso14046', [rule(ws, sym, vw)], [], prior), `${sym} refusal`).toThrow(chain ? /consumed by another worksheet/ : /read by gate/);
    }
    // the -04 whole-worksheet rule on study_type: C / D / E / H refused (consumed producers; lci_result / characterization_factor → EQ-01), A / B / F / G / K / M field-less (accepted but inert — not emitted, Task 8 lesson)
    const sec = (code: string) => [{ standard: STD, worksheet: 'ISO-14046-04', section_code: code, visible_when: STAGED_SECTION_RULE_04, verification_quote: 'q' }];
    for (const code of ['C', 'D', 'E', 'H']) expect(() => emitFieldConfigSql('iso14046', [], sec(code), prior), code).toThrow(/consumed by another worksheet/);
    expect(() => emitFieldConfigSql('iso14046', [], sec('D'), prior)).toThrow(/lci_result → EQ-01 category_indicator_result \(consumed by ISO-14046-05, ISO-14046-06\)/);
    for (const code of ['A', 'B', 'F', 'G', 'K', 'M']) {
      expect(() => emitFieldConfigSql('iso14046', [], sec(code), prior), code).not.toThrow();
      expect(Object.entries(prior).filter(([k, r]) => k.startsWith('ISO-14046-04 ') && (r as Row).section_code === code), `${code} field-less`).toEqual([]);
    }
    expect(gateReaders(prior, 'ISO-14046-04', 'impact_categories', STAGED_SECTION_RULE_04).map((g) => g.code)).toEqual(['REQ-12']);
    expect(gateReaders(prior, 'ISO-14046-04', 'geo_temporal_considered', STAGED_SECTION_RULE_04).map((g) => g.code)).toEqual(['REQ-14']);
    expect(gateReaders(prior, 'ISO-14046-04', 'weighting_applied', STAGED_SECTION_RULE_04).map((g) => g.code)).toEqual(['REQ-15']);
    // the two WITHHELD hides: the emitter would accept them — withheld on the transcript's own words (J-1 L729 closed-loop avoids allocation; J-2 L996 "estudio comparativo")
    expect(() => emitFieldConfigSql('iso14046', [rule('ISO-14046-03', 'recycling_allocation_type', "allocation_procedure IN {'physical_relationship', 'other_relationship_economic'}")], [], prior)).not.toThrow();
    expect(() => emitFieldConfigSql('iso14046', [rule('ISO-14046-06', 'comparative_study_equivalence', 'comparative_assertion_public == true')], [], prior)).not.toThrow();
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'recycling_allocation_type' || e.symbol === 'comparative_study_equivalence')).toBeUndefined();
    expect(Q.L729_730).toContain('En estos casos se evita la necesidad de asignación');
    expect(Q.L996).toContain('En un estudio comparativo, la equivalencia de los sistemas que van a compararse debe evaluarse antes de la interpretación de los resultados.');
    // the IF-guard exemption the G-blocks rely on: once REQ-18 reads `IF report_type == 'third_party' THEN third_party_report == true` the gate no longer refuses the hide
    const guarded: PriorSnapshot = { ...prior, gates: { ...prior.gates, 'ISO-14046-06 REQ-18': { ...prior.gates!['ISO-14046-06 REQ-18'], condition: "IF report_type == 'third_party' THEN third_party_report == true" } } };
    expect(gateReaders(guarded, 'ISO-14046-06', 'third_party_report', THIRD_PARTY)).toEqual([]);
    // … but the IN guard of REQ-11 (G-7) is never exempt (compare guards only)
    const inGuarded: PriorSnapshot = { ...prior, gates: { ...prior.gates, 'ISO-14046-03 REQ-11': { ...prior.gates!['ISO-14046-03 REQ-11'], condition: "IF allocation_procedure IN {'physical_relationship', 'other_relationship_economic'} THEN allocation_balance_preserved IS NOT NULL AND allocation_sensitivity_done IS NOT NULL" } } };
    expect(gateReaders(inGuarded, 'ISO-14046-03', 'allocation_balance_preserved', "allocation_procedure IN {'physical_relationship', 'other_relationship_economic'}").map((g) => g.code)).toEqual(['REQ-11']);
    // the captured gate set: 22 gates, REQ-21 the one warn (TRUE), REQ-22 unconditional on all three Annex-A symbols, REQ-12 unconditional (blocks an inventory study), 0 unparseable
    expect(Object.keys(prior.gates!)).toHaveLength(22);
    expect(prior.gates!['ISO-14046-01 REQ-21']).toMatchObject({ condition: 'TRUE', severity: 'warn' });
    expect(prior.gates!['ISO-14046-02 REQ-22'].condition).toBe('is_organization_assessment IS NOT NULL AND consolidation_method IS NOT NULL AND organization_boundary IS NOT NULL');
    expect(prior.gates!['ISO-14046-04 REQ-12'].condition).toBe('impact_categories IS NOT EMPTY AND category_indicators IS NOT EMPTY AND characterization_model IS NOT EMPTY');
    expect(prior.gates!['ISO-14046-06 REQ-18'].condition).toBe('report_type  ==  internal OR third_party_report  ==  true');
    expect(Object.values(prior.gates!).filter((g) => g.parse_error)).toEqual([]);
    expect(Object.keys(prior.equations!)).toEqual(['ISO-14046-04 EQ-01']);
    // no self-consumer entries in this capture
    for (const [k, r] of Object.entries(prior)) {
      if (!k.includes(' ') || ['sections', 'equations', 'gates', '_meta'].includes(k)) continue;
      expect((r as Row).consumer_worksheets ?? [], k).not.toContain(k.split(' ')[0]);
    }
    // the created outputs are consumer-free and gate-free
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) expect(gateReaders(prior, e.worksheet, e.symbol, e.visible_when ?? 'x == 1', new Set([`${e.worksheet} ${e.symbol}`]))).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin, default refuse mode, no warnings): 25 INSERTs, 1 UPDATE, 0 section UPDATEs, no enum_values UPDATE', () => {
    const { up, down, warnings } = emitFieldConfigSql('iso14046', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('iso14046', '20260917102610');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(1);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(25);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
    expect(up).toMatch(/^UPDATE fields f SET widget = 'scalar', ui_config = NULL, lookup = NULL, visible_when = 'critical_review_type == ''panel_review''' FROM .* AND f\.symbol = 'review_panel_members' AND w\.code = 'ISO-14046-07'/m);
  });
});
