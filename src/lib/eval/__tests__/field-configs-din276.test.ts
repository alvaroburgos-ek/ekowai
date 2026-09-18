/**
 * Plan 3 Task 13 — DIN-276 field configs: every entry parses through the zod
 * contract, the key-string rule (G-A3) holds (created selects / register enum
 * columns ↔ the seeded tables), the string-literal trap is pinned (no enum token
 * compared by literal is a column key or a worksheet symbol in scope), every
 * lookup_fill is a created text twin keyed on the created selector, the ONE
 * emitted visibility UPDATE targets a consumer-free field, the refusals that went
 * to STAGED are pinned against the capture (transitive roll-up chain, consumed
 * limits, range consumer tokens), and the committed migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, VAT_RATE_VISIBLE, KG_WORKSHEETS, secondLevelOf, kgRegisterSymbol, kg2SumSymbol, MATRIX_UI, SONDERKOSTEN_UI, VERGABE_UI, EINHEIT_EXPR, TAB4_KG_EINHEIT_EXPR, ABWEICHUNG_EXPR, imKgExpr, AKTUELL_EXPR } from '../field-configs/din276';
import { EQUATIONS } from '../equations/din276';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric } from '@/lib/expr';
import { table1AsTable, table2AsTable, KG_LEVEL1, STAGE_TOKENS, SONDERKOSTEN_ART } from '../regulation-tables-seed-din276';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/din276.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'DIN-276';
const symbolsOn = (ws: string) => new Set(Object.keys(prior).filter((k) => k.startsWith(`${ws} `)).map((k) => k.slice(ws.length + 1)));

describe('DIN-276 field configs (Plan 3 Task 13)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; no section rule', () => {
    for (const e of FIELD_CONFIGS) {
      expect(() => parseFieldConfig({ widget: e.widget, uiConfig: e.ui_config ?? null, lookup: e.lookup ?? null, visibleWhen: e.visible_when ?? null }), `${e.worksheet} ${e.symbol}`).not.toThrow();
      if (e.visible_when) expect(parseCondition(e.visible_when), `${e.symbol} visible_when`).not.toBeNull();
      if (e.create) expect(e.create.description.startsWith('Plan 3:'), `${e.symbol} description`).toBe(true);
      expect(e.verification_quote.trim().length, `${e.symbol} quote`).toBeGreaterThan(0);
      expect(e.verification_quote.includes('undefined'), `${e.symbol} quote has an unresolved span`).toBe(false);
      if (e.widget === 'register') for (const c of (e.ui_config as RegisterUiConfig).columns) {
        if (c.expr) expect(parseNumeric(c.expr).ok, `${e.symbol}.${c.key} expr`).toBe(true);
        if (c.visible_when) expect(parseCondition(c.visible_when), `${e.symbol}.${c.key} visible_when`).not.toBeNull();
      }
    }
    expect(SECTION_VISIBILITY).toEqual([]);
  });

  it('counts: 134 entries = 133 create + 1 UPDATE; 14 registers, 1 select_one, 3 lookup_fill, 115 derived outputs, 1 scalar visibility rule', () => {
    expect(FIELD_CONFIGS).toHaveLength(134);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(133);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual(['DIN-276-23 GK_mwst_satz_pct']);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual([
      'DIN-276-04 flurstuecke', 'DIN-276-07 kennwert_quellen', 'DIN-276-08 sonderkosten',
      ...KG_WORKSHEETS.map((k) => `${k.ws} ${kgRegisterSymbol(k.n)}`),
      'DIN-276-18 kostenstufen_matrix', 'DIN-276-21 vergabeeinheiten', 'DIN-276-27 abweichungen',
    ]);
    expect(byWidget('select_one')).toEqual(['DIN-276-24 kg_selector']);
    expect(byWidget('lookup_fill')).toEqual(['DIN-276-24 reference_unit_einheit', 'DIN-276-24 reference_unit_bezeichnung', 'DIN-276-24 reference_unit_ermittlung']);
    expect(byWidget('derived')).toHaveLength(115);
    expect(byWidget('scalar')).toEqual(['DIN-276-23 GK_mwst_satz_pct']);
    expect(FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`)).toEqual([`DIN-276-23 GK_mwst_satz_pct :: ${VAT_RATE_VISIBLE}`]);
    // 84 KG outputs = 8 × 4 + 52 second-level Σ twins (one per printed second-level KG, Table 1)
    expect(KG_WORKSHEETS.reduce((n, k) => n + secondLevelOf(k.kg1).length, 0)).toBe(52);
    expect(FIELD_CONFIGS.filter((e) => /^kg_\d{3}_from_rows$/.test(e.symbol))).toHaveLength(52);
    // every created field lands in a captured coded section of its worksheet (C / D)
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) expect(prior.sections![`${e.worksheet} ${e.create!.section_code}`], `${e.worksheet} ${e.create!.section_code}`).toBeDefined();
    expect(new Set(FIELD_CONFIGS.filter((x) => x.create).map((e) => e.create!.section_code))).toEqual(new Set(['C', 'D']));
    // no created symbol collides with a captured prod symbol on its worksheet
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) expect(symbolsOn(e.worksheet).has(e.symbol), `${e.worksheet} ${e.symbol} already exists in prod`).toBe(false);
  });

  it('G-A3 key-string equality: kg_selector options = TABLE2 keys (with the printed Table-2 designations as labels); matrix stufe / Sonderkosten art / VE status tokens; register kg pickers bind TABLE1 grouped by group_label', () => {
    const sel = byKey('DIN-276-24', 'kg_selector');
    expect((sel.enum_values as Array<{ value: string; label_de: string }>).map((o) => o.value)).toEqual([...KG_LEVEL1]);
    expect((sel.enum_values as Array<{ value: string; label_de: string }>).map((o) => o.label_de)).toEqual(['100 Property', '200 Preparatory measures', '300 Building - Building constructions', '400 Building - Technical installations', '500 Outdoor facilities and open spaces', '600 Furnishings and works of art', '700 Incidental building costs', '800 Financing']);
    expect(table2AsTable().rows.map((r) => r.keys.kg)).toEqual([...KG_LEVEL1]);
    expect(MATRIX_UI.columns.find((c) => c.key === 'stufe')!.options).toEqual([...STAGE_TOKENS]);
    expect(SONDERKOSTEN_UI.columns.find((c) => c.key === 'art')!.options).toEqual([...SONDERKOSTEN_ART]);
    expect(VERGABE_UI.columns.find((c) => c.key === 'status')!.options).toEqual(['angebot', 'auftrag', 'rechnung']);
    const t1keys = new Set(table1AsTable().rows.map((r) => r.keys.kg));
    for (const r of FIELD_CONFIGS.filter((x) => x.widget === 'register')) {
      const cfg = registerCfg(r.worksheet, r.symbol);
      for (const c of cfg.columns.filter((x) => x.type === 'lookup_key')) expect(c.lookup).toEqual({ table_code: 'TABLE1', group_by: 'group_label' });
      for (const c of cfg.columns.filter((x) => x.type === 'lookup_value')) expect(c.lookup).toMatchObject({ table_code: 'TABLE1', key_column: 'kg' });
      expect(cfg.override).toBeUndefined(); // the typed EUR is the engineer's figure; the Table-1 structure is not overridable (I-4 / brief deviation, observation)
    }
    expect(t1keys.size).toBe(326);
    // prod drivers read by the emitted rule / the STAGED rules (capture)
    expect(enumValues('DIN-276-03 vat_treatment')).toEqual(['gross', 'net', 'mixed']);
    expect(enumValues('DIN-276-02 cost_breakdown_depth')).toEqual(['level_1', 'level_2', 'level_3']);
    expect(enumValues('DIN-276-01 construction_activity')).toEqual(['neubau', 'umbau', 'modernisierung', 'bestand']);
    expect(enumValues('DIN-276-28 cost_target_type')).toEqual(['upper_limit', 'target_figure']);
    expect(priorRow('DIN-276-01 special_cost_flags').enum_values).toBeNull(); // Plan-1 selection migration unapplied — the register `art` tokens are this task's own (din276-J-4)
  });

  it('string-literal trap (X-1, widened in fix round 1): no literal compared in ANY expression — register column exprs / column visible_when, equation formulas, field visible_when — is a register column key, a prod symbol or a created symbol of its worksheet (13b made the engine safe; the pin documents the invariant)', () => {
    const literals = (expr: string): string[] => [
      ...[...expr.matchAll(/(?:==|!=)\s*'([^']+)'/g)].map((m) => m[1]),
      ...[...expr.matchAll(/\bIN\s*\{([^}]*)\}/g)].flatMap((m) => m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean)),
    ];
    const created = (ws: string) => new Set(FIELD_CONFIGS.filter((e) => e.worksheet === ws && e.create).map((e) => e.symbol));
    const columnKeys = (ws: string) => new Set(FIELD_CONFIGS.filter((e) => e.worksheet === ws && e.widget === 'register').flatMap((e) => registerCfg(ws, e.symbol).columns.map((c) => c.key)));
    const forbidden = (ws: string) => new Set([...symbolsOn(ws), ...created(ws), ...columnKeys(ws)]);
    const check = (ws: string, where: string, expr: string | null | undefined) => { if (!expr) return; const f = forbidden(ws); for (const lit of literals(expr)) expect(f.has(lit), `${ws} ${where}: literal '${lit}' is a column key / symbol in scope`).toBe(false); };
    let n = 0;
    for (const e of FIELD_CONFIGS) {
      check(e.worksheet, `${e.symbol}.visible_when`, e.visible_when); if (e.visible_when) n++;
      if (e.widget === 'register') for (const c of registerCfg(e.worksheet, e.symbol).columns) { check(e.worksheet, `${e.symbol}.${c.key}`, c.expr); check(e.worksheet, `${e.symbol}.${c.key}.visible_when`, c.visible_when); if (c.expr) n++; }
    }
    for (const q of EQUATIONS) { check(q.worksheet, q.equation_number, q.formula); n++; }
    for (const sec of SECTION_VISIBILITY) { check(sec.worksheet, `section ${sec.section_code}`, sec.visible_when); n++; }
    expect(n).toBe(175); // every expression surface walked: 1 field rule + 8 × 7 KG column exprs + 2 matrix + 1 VE column exprs + 115 formulas
    expect(literals(AKTUELL_EXPR)).toEqual(['rechnung', 'auftrag']);
    expect(VERGABE_UI.columns.map((c) => c.key)).toContain('auftrag_eur'); // the amount columns are suffixed (the pre-13b collision)
    expect(literals(imKgExpr('KG 300'))).toEqual(['KG 300']); // a space — never an identifier
    expect(literals(VAT_RATE_VISIBLE)).toEqual(['gross', 'mixed']);
    expect(literals(EINHEIT_EXPR)).toEqual(['KG 400', 'KG 300']);
    expect(EINHEIT_EXPR).toContain("lookup('TABLE4', kg, tab4_nr, 'unit')");
    expect(EINHEIT_EXPR).toContain("lookup('TABLE2', lookup('TABLE1', kg, 'kg1_key'), 'unit')"); // L1022 fallback through the first-level ancestor
    expect(TAB4_KG_EINHEIT_EXPR).toBe("lookup('TABLE4', kg, '0', 'unit')");
    expect(ABWEICHUNG_EXPR).toContain('abs(kosten_eur - menge * kennwert) < 0.005'); // cent tolerance (round() is one-argument)
  });

  it('lookup_fill: three created TEXT twins on DIN-276-24 keyed on the created kg_selector (TABLE2 key column order, value columns exist); the existing number `reference_unit` (IDENT-03 input) is not re-bound (amendment J)', () => {
    const t2 = table2AsTable();
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill')) {
      expect(e.lookup!.table_code).toBe('TABLE2');
      expect(e.lookup!.keys.map((k) => k.column)).toEqual(t2.key_columns);
      expect(e.lookup!.keys.map((k) => k.from_symbol)).toEqual(['kg_selector']);
      expect(t2.value_columns.map((c) => c.name)).toContain(e.lookup!.value);
      expect(e.create!.data_type).toBe('text');
      expect(e.lookup!.role).toBe('value');
    }
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'reference_unit')).toBeUndefined();
    expect(priorRow('DIN-276-24 reference_unit').data_type).toBe('number');
    expect(prior.equations!['DIN-276-24 IDENT-03']).toMatchObject({ output_symbol: 'cost_parameter', input_symbols: ['cost', 'reference_unit'] });
  });

  it('registers: matrix (5 stage tokens, 8 required KG columns, derived Σ / Bauwerk, 11 footer symbols), KG registers (TABLE1 picker, Tab.-2/3/4 unit, Menge × Kennwert, im_kg badge, footer = the D-outputs), Sonderkosten / VE / Abweichungen / Flurstücke / Quellen footers', () => {
    const m = registerCfg('DIN-276-18', 'kostenstufen_matrix');
    expect(m.columns.filter((c) => c.required).map((c) => c.key)).toEqual(['stufe', 'datum', 'kg100', 'kg200', 'kg300', 'kg400', 'kg500', 'kg600', 'kg700', 'kg800']);
    expect(m.columns.find((c) => c.key === 'gesamt')!.expr).toBe('kg100 + kg200 + kg300 + kg400 + kg500 + kg600 + kg700 + kg800');
    expect(m.columns.find((c) => c.key === 'bauwerk')!.expr).toBe('kg300 + kg400');
    expect(m.footer).toEqual(['KR_gesamt_calc', 'KSch_gesamt_calc', 'KBer_gesamt_calc', 'KA_gesamt_calc', 'KF_gesamt_calc', 'stufen_count', 'stufe_aktuell_gesamt', 'stufe_vorher_gesamt', 'stufen_abweichung', 'stufen_abweichung_pct', 'bauwerk_aktuell']);
    for (const k of KG_WORKSHEETS) {
      const cfg = registerCfg(k.ws, kgRegisterSymbol(k.n));
      expect(cfg.columns.map((c) => c.key)).toEqual(['kg', 'bezeichnung', 'tab4_nr', 'ebene1', 'ebene2', 'tab4_kg_einheit', 'menge', 'einheit', 'kennwert', 'kosten_calc', 'kosten_eur', 'abw', 'im_kg', 'hinweis']);
      expect(cfg.columns.filter((c) => c.required).map((c) => c.key)).toEqual(['kg', 'kosten_eur']);
      expect(cfg.columns.find((c) => c.key === 'im_kg')!.expr).toBe(imKgExpr(k.kg1));
      expect(cfg.footer).toEqual([`kg${k.n}_positionen_sum`, `kg${k.n}_positionen_count`, `kg${k.n}_positionen_fremd`, `kg${k.n}_positionen_abweichend`, ...secondLevelOf(k.kg1).map((l) => kg2SumSymbol(l.code))]);
      for (const sym of cfg.footer!) expect(byKey(k.ws, sym)?.widget, `${k.ws} ${sym}`).toBe('derived');
    }
    expect(secondLevelOf('KG 300').map((l) => l.code)).toEqual(['310', '320', '330', '340', '350', '360', '370', '380', '390']);
    expect(secondLevelOf('KG 100').map((l) => l.code)).toEqual(['110', '120', '130']);
    expect(registerCfg('DIN-276-08', 'sonderkosten').footer).toEqual(['sonderkosten_bausubstanz_sum', 'sonderkosten_beigestellt_sum', 'sonderkosten_besondere_sum', 'sonderkosten_prognose_sum', 'sonderkosten_risiko_sum', 'sonderkosten_nicht_separat']);
    expect(registerCfg('DIN-276-21', 'vergabeeinheiten').footer).toEqual(['KA_kostenstand_calc', 'vergabeeinheiten_count', 'KA_angebote_count', 'KA_auftraege_count', 'KA_rechnungen_count']);
    expect(registerCfg('DIN-276-27', 'abweichungen').columns.filter((c) => c.required).map((c) => c.key)).toEqual(['kg', 'betrag', 'ursache']);
    expect(registerCfg('DIN-276-04', 'flurstuecke').footer).toEqual(['grundstuecksflaeche_GF_calc', 'flurstuecke_count']);
    expect(registerCfg('DIN-276-07', 'kennwert_quellen').footer).toEqual(['kennwert_quellen_count']);
    expect(registerCfg('DIN-276-07', 'kennwert_quellen').columns.find((c) => c.key === 'standard')!.datalist).toBeUndefined(); // fix round 1: 'einfach / mittel / hoch' was unsourced
    expect(registerCfg('DIN-276-27', 'abweichungen').columns.find((c) => c.key === 'typ')!.datalist).toEqual(['Planungsänderung', 'Preisentwicklung', 'Mengenänderung', 'Sonstige']); // prod's own AA_typ description, re-cased (J-1)
    // every footer symbol of every register is a created derived field on the same worksheet
    for (const r of FIELD_CONFIGS.filter((x) => x.widget === 'register')) for (const sym of registerCfg(r.worksheet, r.symbol).footer!) expect(byKey(r.worksheet, sym)?.widget, `${r.worksheet} ${sym}`).toBe('derived');
  });

  it('visibility: the one UPDATE targets a consumer-free field whose driver reaches -23 only after the range-token consumer edit (din276-C-1); the brief\'s other targets are refused / withheld and pinned (C-2 … C-4, J-5)', () => {
    expect(priorRow('DIN-276-23 GK_mwst_satz_pct').consumer_worksheets).toBeNull();
    expect(priorRow('DIN-276-03 vat_treatment').consumer_worksheets).toEqual(['DIN-276-09..16', 'DIN-276-18..23']); // range tokens never match `code = ANY(...)`
    expect(priorRow('DIN-276-02 applicable_cost_groups').consumer_worksheets).toEqual(['DIN-276-09..16']);   // M-1 driver (select_many) + range token
    expect(priorRow('DIN-276-03 planning_stage_active').consumer_worksheets).toEqual(['DIN-276-18..22']);    // M-2 driver
    expect(priorRow('DIN-276-02 cost_breakdown_depth').consumer_worksheets).toEqual(['DIN-276-09..16', 'DIN-276-18..22']);
    expect(priorRow('DIN-276-02 separate_calculations_per_building').consumer_worksheets).toEqual(['DIN-276-09..29']); // C-4: non-empty consumers → guard refuses
    expect(priorRow('DIN-276-08 existing_substance_value').consumer_worksheets).toEqual(['DIN-276-23']);            // C-4
    expect(priorRow('DIN-276-28 cost_target_upper_limit').consumer_worksheets).toEqual(['DIN-276-29']);             // J-5 (L416 refutes the rule anyway)
    expect(priorRow('DIN-276-01 construction_activity').consumer_worksheets).toEqual(['DIN-276-03', 'DIN-276-07']); // never reaches -08
    // C-2: every third-level kg_NNN feeds a roll-up whose first-level total is consumed by -17 / -23 → the transitive guard refuses
    expect(prior.equations!['DIN-276-11 KG3-01']).toMatchObject({ output_symbol: 'kg_310_total' });
    expect(prior.equations!['DIN-276-11 KG3-10'].input_symbols).toContain('kg_310_total');
    expect(priorRow('DIN-276-11 kg_300_total').consumer_worksheets).toEqual(['DIN-276-17', 'DIN-276-23', 'DIN-276-25']);
    expect(priorRow('DIN-276-11 kg_311').consumer_worksheets).toBeNull();
    expect(() => emitFieldConfigSql('din276', [{ standard: STD, worksheet: 'DIN-276-11', symbol: 'kg_311', widget: 'scalar', ui_config: null, visible_when: "cost_breakdown_depth == 'level_3'", verification_quote: 'q' }], [], prior)).toThrow(/consumed/);
    expect(() => emitFieldConfigSql('din276', [], [{ standard: STD, worksheet: 'DIN-276-11', section_code: 'KG 310', visible_when: "cost_breakdown_depth == 'level_3'", verification_quote: 'q' }], prior)).toThrow(/consumed/);
    expect(() => emitFieldConfigSql('din276', [{ standard: STD, worksheet: 'DIN-276-02', symbol: 'separate_calculations_per_building', widget: 'attestation', ui_config: null, visible_when: 'multi_building == true', verification_quote: 'q' }], [], prior)).toThrow(/consumed/);
    expect(() => emitFieldConfigSql('din276', [{ standard: STD, worksheet: 'DIN-276-08', symbol: 'existing_substance_value', widget: 'scalar', ui_config: null, visible_when: 'construction_activity IN {umbau, modernisierung, bestand}', verification_quote: 'q' }], [], prior)).toThrow(/consumed/);
    expect(() => emitFieldConfigSql('din276', [{ standard: STD, worksheet: 'DIN-276-28', symbol: 'cost_target_upper_limit', widget: 'scalar', ui_config: null, visible_when: "cost_target_type == 'upper_limit'", verification_quote: 'q' }], [], prior)).toThrow(/consumed/);
    // the emitted rule is accepted (Task 12c round 2: DIN-276-23 REQ-26 carries an EMPTY condition — `manual` at the engine, exempt from the gate-aware guard)
    expect(() => emitFieldConfigSql('din276', [byKey('DIN-276-23', 'GK_mwst_satz_pct')], [], prior)).not.toThrow();
    // the -24 Kennwert inputs: building_costs / BGF / BRI reach -24 (capture), GK_total / kg_300_total do not (din276-C-5)
    expect(priorRow('DIN-276-25 building_costs').consumer_worksheets).toContain('DIN-276-24');
    expect(priorRow('DIN-276-05 gross_floor_area_BGF').consumer_worksheets).toContain('DIN-276-24');
    expect(priorRow('DIN-276-05 gross_volume_BRI').consumer_worksheets).toEqual(['DIN-276-24']);
    expect(priorRow('DIN-276-23 GK_total').consumer_worksheets).toBeNull();
    expect(priorRow('DIN-276-11 kg_300_total').consumer_worksheets).not.toContain('DIN-276-24');
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin): 133 INSERT … WHERE NOT EXISTS, 1 UPDATE fields, 0 UPDATE worksheet_sections', () => {
    // Task 12c (round 2): the committed prior carries `gates`; every rule of this module passes the gate-aware guard in the
    // default (refuse) mode — 0 refusals, so this pin runs the guard for real (no warn mode).
    const { up, down } = emitFieldConfigSql('din276', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    const files = fieldConfigFilesFor('din276', '20260917101310');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/INSERT INTO fields/g) ?? []).length).toBe(133);
    expect((up.match(/UPDATE fields f SET/g) ?? []).length).toBe(1);
    expect(up).not.toContain('UPDATE worksheet_sections');
    expect((down.match(/f\.description LIKE 'Plan 3:%'/g) ?? []).length).toBe(133);
    expect(down).toContain("visible_when = NULL"); // the captured prior of GK_mwst_satz_pct (widget / ui_config / lookup / visible_when all NULL)
  });
});
