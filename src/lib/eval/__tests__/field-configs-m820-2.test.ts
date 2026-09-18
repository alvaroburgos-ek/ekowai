/**
 * Plan 3 Task 19 — DWA-M-820-2 field configs: every entry parses through the zod
 * contract, the checklist options equal the seeded outline rows (G-A3 for text
 * catalogues), the Plan-1 `change_orders` register is upgraded IN PLACE with its
 * column keys kept, the emitter accepts the module against the captured prior
 * (default refuse mode — no `--gate-guard=warn`), every rule the brief asked for on
 * an EXISTING field is asserted REFUSED (producer and / or gate-aware guard — not
 * discovered) and lives on the sheet, and the committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, PROJEKTHANDBUCH_KAPITEL, STATUSBERICHT_ABSCHNITTE, CHANGE_ORDER_STATUS, LOP_STATUS, OFFEN_TOKEN } from '../field-configs/m820_2';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig, type SelectManyUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { SELECTION_CONFIGS, type RegisterConfig } from '../selection-fields';
import { anhangAAsTable, anhangBAsTable } from '../regulation-tables-seed-m820_2';
import { emitFieldConfigSql, fieldConfigFilesFor, gateReaders, loadPriorSnapshot, producerChain } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/m820_2.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
const priorRow = (key: string) => (prior as Record<string, { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null }>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'DWA-M-820-2';
const entry = (ws: string, sym: string, visible_when: string) => ({ standard: STD, worksheet: ws, symbol: sym, widget: 'scalar' as const, ui_config: null, visible_when, verification_quote: 'q' });

describe('DWA-M-820-2 field configs (Plan 3 Task 19)', () => {
  it('every entry parses through parseFieldConfig; register exprs / visible_when parse; create descriptions carry the rollback selector; no quote is undefined', () => {
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

  it('counts: 25 field entries (24 create, 1 update = change_orders upgraded in place), widgets by kind, ZERO visibility rules (every brief target is consumed / gate-read)', () => {
    expect(FIELD_CONFIGS).toHaveLength(25);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(24);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['820-2-06 offene_punkte', '820-2-12 entscheidungen', '820-2-13 dritte', '820-2-16 auflagen', '820-2-19 vergaben_los', '820-2-21 change_orders', '820-2-24 gewaehrleistungen']);
    expect(byWidget('select_many')).toEqual(['820-2-05 projekthandbuch_kapitel', '820-2-06 statusbericht_abschnitte']); // both CREATED json — no S-block (amendment N)
    expect(byWidget('attestation')).toEqual(['820-2-16 einleitung_vorhanden', '820-2-27 bim_methode_angewendet']);
    expect(byWidget('lookup_fill')).toEqual([]);
    expect(byWidget('select_one')).toEqual([]);
    expect(byWidget('derived')).toHaveLength(14); // one per equation row
    // the ONE update entry: the Plan-1 register (no visible_when, no enum_values — D-1)
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when ?? 'null'} :: ${e.enum_values ?? 'none'}`)).toEqual(['820-2-21 change_orders :: null :: none']);
    expect(FIELD_CONFIGS.filter((e) => e.visible_when)).toEqual([]);
    // the brief's targets are NOT entries (each on the sheet): -22 pair (G-1 / C-1), discharge_permit_extension (G-2 / C-2), the VOB trio (G-3 / G-4 / C-3),
    // the BIM / innovation fields (G-5 … G-7 / C-4 / J-3), hoai_compliance (J-2), the Bedarfsplanung booleans (J-1), lph_completed (E-1 — keep_prod, no UPDATE)
    for (const sym of ['testbetrieb_planned', 'abnahme_per_bild4', 'discharge_permit_extension', 'nebenangebote_conditions', 'eignungskriterien_set', 'leistungsbeschreibung_type', 'bim_basics_established', 'data_platform_defined', 'gis_data_quality', 'liability_clarified', 'ip_rights_defined', 'hoai_compliance', 'framework_conditions_clarified', 'forward_planning_done', 'changed_needs_recognised', 'lph_completed', 'included_hoai_phases', 'final_contract_value', 'warranty_start_date', 'warranty_end_date']) {
      expect(FIELD_CONFIGS.find((e) => e.symbol === sym), sym).toBeUndefined();
    }
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) {
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
      expect(e.create!.section_code).toBe(e.widget === 'derived' ? 'D' : 'C'); // content in C, results in D ("Results / Derived Values")
    }
  });

  it('checklists: the options are exactly the seeded outline rows (Anhang B 8 chapters, Anhang A 19 sections + 2 annexes, grouped); created as json (no S-block)', () => {
    const hb = byKey('820-2-05', 'projekthandbuch_kapitel');
    expect(hb.create?.data_type).toBe('json');
    expect(hb.enum_values).toBe(PROJEKTHANDBUCH_KAPITEL);
    expect(PROJEKTHANDBUCH_KAPITEL.map((e) => e.value)).toEqual(anhangBAsTable().rows.map((r) => r.values.gedruckt));
    expect(PROJEKTHANDBUCH_KAPITEL.map((e) => e.value)).toEqual([
      '1 Aufbau und Organisation des Organisationshandbuchs', '2 Projektinformationen', '3 Aufbauorganisation', '4 Aufgabenbeschreibungen',
      '5 Projekt- und Planungsorganisation', '6 EDV-, CAD-, BIM-Regelungen', '7 Terminliche Abwicklung', '8 Kostenmanagement',
    ]);
    const sb = byKey('820-2-06', 'statusbericht_abschnitte');
    expect(sb.create?.data_type).toBe('json');
    expect(STATUSBERICHT_ABSCHNITTE.map((e) => e.value)).toEqual(anhangAAsTable().rows.map((r) => r.values.gedruckt));
    expect(STATUSBERICHT_ABSCHNITTE).toHaveLength(21);
    const ui = parseFieldConfig({ widget: 'select_many', uiConfig: sb.ui_config, lookup: null, visibleWhen: null }).ui as SelectManyUiConfig;
    expect(ui.groups?.map((g) => [g.label, g.options.length])).toEqual([['Inhaltsverzeichnis', 19], ['Anhang', 2]]);
    for (const g of ui.groups ?? []) for (const o of g.options) expect(STATUSBERICHT_ABSCHNITTE.map((e) => e.value)).toContain(o);
    expect(ui.allow_custom).toBeUndefined();
    // the existing booleans they sit beside are consumed / gate-read — NOT touched
    expect(priorRow('820-2-05 project_handbook_complete').consumer_worksheets).toEqual(['820-2-06', '820-2-15']);
    expect(prior.gates!['820-2-05 REQ-07'].symbols).toEqual(['project_handbook_complete']);
  });

  it('change_orders is upgraded in place: Plan-1 column KEYS kept in order, aenderung / status required (0 stored rows in prod), datum typed date, sum_column retired for the equation footer', () => {
    const plan1 = (SELECTION_CONFIGS.change_orders as RegisterConfig).columns;
    const cfg = registerCfg('820-2-21', 'change_orders');
    expect(cfg.columns.map((c) => c.key)).toEqual(plan1.map((c) => c.key));
    expect(plan1.map((c) => c.key)).toEqual(['aenderung', 'datum', 'kosten_eur', 'terminwirkung', 'entscheidung', 'status']);
    expect(cfg.columns.find((c) => c.key === 'aenderung')?.required).toBe(true);
    expect(cfg.columns.find((c) => c.key === 'status')?.required).toBe(true); // an unset status makes count_rows(…, status == 'offen') undecidable (probed)
    expect(cfg.columns.find((c) => c.key === 'kosten_eur')?.required).toBeUndefined(); // stays optional — the Σ reads empty as 0
    expect(cfg.columns.find((c) => c.key === 'datum')?.type).toBe('date');
    expect(plan1.find((c) => c.key === 'datum')?.type).toBe('text'); // Plan-1 typed it text (TT.MM.JJJJ placeholder)
    expect(cfg.columns.find((c) => c.key === 'status')?.options).toEqual([...CHANGE_ORDER_STATUS]);
    expect((plan1.find((c) => c.key === 'status') as { options?: readonly string[] }).options).toEqual([...CHANGE_ORDER_STATUS]);
    expect(OFFEN_TOKEN).toBe('offen');
    expect(cfg.footer).toEqual(['change_orders_count', 'change_orders_sum', 'change_orders_open']);
    expect(cfg.sum_column).toBeUndefined(); // D-2b-5
    expect(cfg.placement).toBe('bottom');
    expect(priorRow('820-2-21 change_orders').consumer_worksheets).toBeNull();
    expect(priorRow('820-2-21 change_orders').data_type).toBe('json');
    // the created registers: column keys
    expect(registerCfg('820-2-06', 'offene_punkte').columns.map((c) => c.key)).toEqual(['punkt', 'verantwortlich', 'termin', 'status']);
    expect(registerCfg('820-2-06', 'offene_punkte').columns.find((c) => c.key === 'status')?.options).toEqual([...LOP_STATUS]);
    expect(registerCfg('820-2-12', 'entscheidungen').columns.map((c) => c.key)).toEqual(['nr', 'datum', 'entscheidung', 'begruendung', 'entscheider']);
    expect(registerCfg('820-2-13', 'dritte').columns.map((c) => c.key)).toEqual(['leistung', 'buero', 'beauftragt']);
    expect(registerCfg('820-2-16', 'auflagen').columns.map((c) => c.key)).toEqual(['auflage', 'genehmigung', 'frist', 'erledigt']);
    expect(registerCfg('820-2-19', 'vergaben_los').columns.map((c) => c.key)).toEqual(['los', 'verfahren', 'zuschlag', 'auftragswert']);
    expect(registerCfg('820-2-24', 'gewaehrleistungen').columns.map((c) => c.key)).toEqual(['auftragnehmer', 'abnahme', 'beginn', 'ende', 'maengel_offen']);
    expect(registerCfg('820-2-24', 'gewaehrleistungen').columns.filter((c) => c.type === 'date').map((c) => c.required)).toEqual([true, true, true]);
    // no register carries an override block or a lookup column (text catalogues are checklists, not lookup targets)
    for (const r of FIELD_CONFIGS.filter((x) => x.widget === 'register')) {
      expect((r.ui_config as RegisterUiConfig).override).toBeUndefined();
      expect((r.ui_config as RegisterUiConfig).columns.some((c) => c.type === 'lookup_key' || c.type === 'lookup_value')).toBe(false);
    }
  });

  it('every visibility rule of the brief on an EXISTING field is refused by the producer and / or gate-aware guard (asserted, not discovered) — all are STAGED G / C blocks', () => {
    // G-1 / C-1: the -22 pair — consumed by -23 / -24 AND read by the unconditional REQ-46 / REQ-47
    const TB = "testbetrieb_vs_abnahme_choice IN {'testbetrieb', 'mischform'}";
    const AB = "testbetrieb_vs_abnahme_choice IN {'abnahmepruefung', 'mischform'}";
    expect(enumValues('820-2-18 testbetrieb_vs_abnahme_choice')).toEqual(['testbetrieb', 'abnahmepruefung', 'mischform']);
    expect(priorRow('820-2-18 testbetrieb_vs_abnahme_choice').consumer_worksheets).toEqual(['820-2-22']); // the driver reaches -22
    expect(priorRow('820-2-22 testbetrieb_planned').consumer_worksheets).toEqual(['820-2-23', '820-2-24']);
    expect(priorRow('820-2-22 abnahme_per_bild4').consumer_worksheets).toEqual(['820-2-23', '820-2-24']);
    expect(gateReaders(prior, '820-2-22', 'testbetrieb_planned', TB).map((g) => g.code)).toEqual(['REQ-46']);
    expect(gateReaders(prior, '820-2-22', 'abnahme_per_bild4', AB).map((g) => g.code)).toEqual(['REQ-47']);
    expect(() => emitFieldConfigSql('m820_2', [entry('820-2-22', 'testbetrieb_planned', TB)], [], prior)).toThrow(/testbetrieb_planned/);
    expect(() => emitFieldConfigSql('m820_2', [entry('820-2-22', 'abnahme_per_bild4', AB)], [], prior)).toThrow(/abnahme_per_bild4/);
    // G-2 / C-2: discharge_permit_extension — consumed by -19, read by REQ-35 (IN, not an IF guard)
    expect(priorRow('820-2-16 discharge_permit_extension').consumer_worksheets).toEqual(['820-2-19']);
    expect(gateReaders(prior, '820-2-16', 'discharge_permit_extension', 'einleitung_vorhanden == true').map((g) => g.code)).toEqual(['REQ-35']);
    expect(() => emitFieldConfigSql('m820_2', [byKey('820-2-16', 'einleitung_vorhanden'), entry('820-2-16', 'discharge_permit_extension', 'einleitung_vorhanden == true')], [], prior)).toThrow(/discharge_permit_extension/);
    // G-3 / G-4 / C-3: the VOB trio — consumed by -19, read by REQ-38 / -39 / -40
    expect(priorRow('820-2-03 vob_applicable').consumer_worksheets).toEqual(['820-2-09', '820-2-17', '820-2-18']);
    for (const [ws, sym, req] of [['820-2-17', 'nebenangebote_conditions', 'REQ-38'], ['820-2-17', 'eignungskriterien_set', 'REQ-39'], ['820-2-18', 'leistungsbeschreibung_type', 'REQ-40']] as const) {
      expect(priorRow(`${ws} ${sym}`).consumer_worksheets).toEqual(['820-2-19']);
      expect(gateReaders(prior, ws, sym, 'vob_applicable == true').map((g) => g.code)).toEqual([req]);
      expect(() => emitFieldConfigSql('m820_2', [entry(ws, sym, 'vob_applicable == true')], [], prior)).toThrow(new RegExp(sym));
    }
    // G-5 … G-7 / C-4: the -26 / -27 fields — consumed; ip_rights_defined read by REQ-56
    expect(priorRow('820-2-26 innovation_scope_defined').consumer_worksheets).toEqual(['820-2-17']);
    expect(priorRow('820-2-26 liability_clarified').consumer_worksheets).toEqual(['820-2-09']);
    expect(priorRow('820-2-26 ip_rights_defined').consumer_worksheets).toEqual(['820-2-28']);
    expect(gateReaders(prior, '820-2-26', 'ip_rights_defined', 'innovation_scope_defined == true').map((g) => g.code)).toEqual(['REQ-56']);
    expect(priorRow('820-2-27 bim_basics_established').consumer_worksheets).toEqual(['820-2-28']);
    expect(() => emitFieldConfigSql('m820_2', [entry('820-2-27', 'data_platform_defined', 'bim_basics_established == true')], [], prior)).toThrow(/consumed by 820-2-28/);
    // J-3: the -28 fields are consumer-free; two are read by the unguarded REQ-60; gis_data_quality would be EMITTABLE — withheld because §8.7 is GIS, not BIM
    expect(priorRow('820-2-28 gis_data_quality').consumer_worksheets).toBeNull();
    expect(gateReaders(prior, '820-2-28', 'gis_data_quality', 'bim_basics_established == true')).toEqual([]);
    expect(gateReaders(prior, '820-2-28', 'digital_rights_clarified', 'bim_basics_established == true').map((g) => g.code)).toEqual(['REQ-60']);
    // J-1: Bedarfsplanung — consumed / gate-read, and refuted by L336 / L1058 anyway
    expect(priorRow('820-2-11 framework_conditions_clarified').consumer_worksheets).toEqual(['820-2-12', '820-2-15']);
    expect(gateReaders(prior, '820-2-11', 'changed_needs_recognised', "project_category == 'konzept'").map((g) => g.code)).toEqual(['REQ-23']);
    // J-2: hoai_compliance — consumed by -15 / -19 (and no printed rule)
    expect(priorRow('820-2-03 hoai_compliance').consumer_worksheets).toEqual(['820-2-15', '820-2-19']);
    expect(() => emitFieldConfigSql('m820_2', [entry('820-2-03', 'hoai_compliance', "contract_type == 'planning'")], [], prior)).toThrow(/consumed by 820-2-15/);
    // prod has no equations: no transitive chain exists anywhere
    expect(prior.equations).toEqual({});
    expect(producerChain(prior, '820-2-24', 'warranty_start_date')).toBeNull();
    expect(Object.keys(prior.gates!)).toHaveLength(59);
    // the four EMPTY gates (manual at runtime — never a refusal): REQ-55 / REQ-59 sit on -25 where nothing of theirs resolves (G-5 / G-7 propose the moves)
    expect(Object.entries(prior.gates!).filter(([, g]) => g.parse_error).map(([k]) => k)).toEqual(['820-2-05 REQ-13', '820-2-20 REQ-50', '820-2-25 REQ-55', '820-2-25 REQ-59']);
    // G-1 parse-shape pin: the staged text is an AND of two parenthesised IF guards (the unparenthesised form folds into ONE guard — m820_1 fix-round lesson)
    const staged = parseCondition("(IF testbetrieb_vs_abnahme_choice == 'testbetrieb' THEN testbetrieb_planned == true) AND (IF testbetrieb_vs_abnahme_choice == 'mischform' THEN testbetrieb_planned == true)")!;
    expect(staged.kind).toBe('and');
    expect(staged.kind === 'and' && [staged.left.kind, staged.right.kind]).toEqual(['guard', 'guard']);
    expect(parseCondition("IF testbetrieb_vs_abnahme_choice == 'testbetrieb' THEN testbetrieb_planned == true AND IF testbetrieb_vs_abnahme_choice == 'mischform' THEN testbetrieb_planned == true")!.kind).toBe('guard');
    // E-1: lph_completed carries prod enum tokens lph_0 … lph_9 (non-null) while the Plan-1 checklist stores label strings — no UPDATE emitted (keep_prod)
    expect(enumValues('820-2-15 lph_completed')).toEqual(['lph_0', 'lph_1', 'lph_2', 'lph_3', 'lph_4', 'lph_5', 'lph_6', 'lph_7', 'lph_8', 'lph_9']);
    expect(priorRow('820-2-01 included_hoai_phases').enum_values).toBeNull();
    expect((SELECTION_CONFIGS.lph_completed as { options: readonly string[] }).options[0]).toBe('LPH 0 – Bedarfsplanung');
  });

  it('no captured field lists its own worksheet as a consumer (Task 12b class) — no self-consumer NOTICE expected', () => {
    const selfConsumers = Object.entries(prior).filter(([k, v]) => k.includes(' ') && !['sections', 'equations', 'gates', '_meta'].includes(k) && Array.isArray((v as { consumer_worksheets?: string[] | null }).consumer_worksheets) && ((v as { consumer_worksheets: string[] }).consumer_worksheets).includes(k.split(' ')[0]));
    expect(selfConsumers.map(([k]) => k)).toEqual([]);
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin, default refuse mode, no warnings)', () => {
    const { up, down, warnings } = emitFieldConfigSql('m820_2', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('m820_2', '20260917101910');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(1);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(24);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
    expect(up).not.toMatch(/visible_when = '[^N]/); // no hide rule anywhere
  });
});
