/**
 * Plan 3 Task 12 — DWA-M-187 field configs: every entry parses through the zod
 * contract, the key-string equality rule (G-A3) holds against the captured prod
 * enums and the seeded tables, every lookup_fill sits on the worksheet of its
 * keys, visibility never lands on a consumed or gate-bearing producer (the
 * refusals that went to STAGED are pinned against the capture), the branch
 * switch's reach is pinned as captured, and the committed migration equals a
 * fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, TAB3_FILL_SYMBOLS, P_A, P_B, P_C, P_BC, SPUR_BC, SPUR_NOT_D, SPUR_C, MIKRO, KLEIN, UV_JA, CSB_HOCH, DATEN_JA, DATEN_NEIN, CARBONAT_JA, GAK_OK_EXPR, H_FK_SS_ROW_EXPR, V_SOLL_ROW_EXPR, LOG_RED_EXPR } from '../field-configs/m187';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric, parseExpression, extractSymbols } from '@/lib/expr';
import { s5LimitsPAsTable, s5LimitsSpurAsTable, s5LimitsAppAsTable, s5335UvAsTable, tabelle3AsTable, bild3AsTable, P_TOKENS, SPUR_TOKENS, APP_TOKENS } from '../regulation-tables-seed-m187';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/m187.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'DWA-M-187';

describe('DWA-M-187 field configs (Plan 3 Task 12)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; four section rules on field-bearing self-consumer-only sections', () => {
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
    expect(SECTION_VISIBILITY.map((s) => `${s.worksheet} ${s.section_code} :: ${s.visible_when}`)).toEqual([`M187-16 B :: ${MIKRO}`, `M187-16 D :: ${MIKRO}`, `M187-22 B :: ${KLEIN}`, `M187-22 D :: ${KLEIN}`]);
    // every rule targets a FIELD-BEARING captured section (a rule on a field-less section is inert and never counts)
    const fieldsIn = (ws: string, sec: string) => Object.entries(prior).filter(([k, v]) => k.startsWith(`${ws} `) && (v as Row).section_code === sec).map(([k]) => k.slice(ws.length + 1));
    expect(fieldsIn('M187-16', 'B')).toEqual(['KBE', 'MPN', 'PBE']);
    expect(fieldsIn('M187-16', 'D')).toEqual(['logstufen_rueckhalt']);
    expect(fieldsIn('M187-22', 'B')).toEqual(['A_b_a', 'AFS63', 'h_RBF']);
    expect(fieldsIn('M187-22', 'D')).toEqual(['A_F', 'A_F_anteil_Aba', 'b_krit', 'b_R_a', 'eta_AFS63']);
    for (const s of SECTION_VISIBILITY) expect(parseCondition(s.visible_when)).not.toBeNull();
  });

  it('counts: 79 field entries (49 create, 30 update — 27 of them self-consumer-only inputs re-emitted in fix round 1), widgets by kind, visibility list', () => {
    expect(FIELD_CONFIGS).toHaveLength(79);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(49);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual([
      'M187-05 S_PO4P_aM', 'M187-05 Fe_massenanteil', 'M187-05 feinmassenanteil', 'M187-05 fallhoehe_einbau', 'M187-05 Fe_gehalt', 'M187-05 p_grund_beladung',
      'M187-05 EBCT', 'M187-05 v_filter_aufstrom', 'M187-05 v_filter_abstrom', 'M187-05 h_FK_SS', 'M187-05 S_PO4P_SS_zu', 'M187-05 S_PO4P_SS_ab',
      'M187-06 GAK_volumenanteil_oben', 'M187-06 GAK_volumenanteil_unten', 'M187-06 CaCO3_massenanteil_GAK', 'M187-06 Q_T_d_aM', 'M187-06 beschickungsdauer_segment', 'M187-06 trockenzeit_nach_vollbeschickung',
      'M187-07 UV_dosis', 'M187-07 pufferschicht_carbonatbrechsand', 'M187-07 betriebsdauer_jahre',
      'M187-09 h_FK_CaCO3', 'M187-09 CaCO3_massenanteil_carbo', 'M187-09 anzahl_sorptionsstufen',
      'M187-16 KBE', 'M187-16 MPN', 'M187-16 PBE', 'M187-16 logstufen_rueckhalt',
      'M187-20 B_CSB', 'M187-20 A_F_pro_AEb',
    ]);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['M187-09 sorptionsstufen', 'M187-13 filterschichten', 'M187-14 filtersegmente', 'M187-16 indikatororganismen', 'M187-20 teilfilterbecken', 'M187-22 klein_rbf_elemente']);
    expect(byWidget('lookup_fill')).toEqual([
      'M187-06 h_FK_min_p', ...TAB3_FILL_SYMBOLS.map((s) => `M187-06 ${s}`),
      'M187-11 h_FK_min_spur', 'M187-11 q_Dr_RBF_limit_spur', 'M187-11 q_Dr_RBF_vorgabe_spur',
      'M187-16 q_Dr_RBF_limit_mikro', 'M187-16 h_FK_min_mikro', 'M187-18 UV_dosis_min',
    ]);
    expect(byWidget('select_one')).toEqual(['M187-20 daten_vorhanden']);
    expect(byWidget('attestation')).toEqual(['M187-19 stoffstromtrennung']);
    expect(byWidget('scalar')).toHaveLength(31); // the 30 UPDATE rules + the created CSB_fracht_d
    expect(byWidget('derived')).toHaveLength(25); // one per equation
    const rules = FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`);
    expect(rules).toEqual([
      `M187-06 h_FK_min_p :: ${P_B}`,
      `M187-05 S_PO4P_aM :: ${P_A}`, `M187-05 Fe_massenanteil :: ${P_B}`, `M187-05 feinmassenanteil :: ${P_B}`, `M187-05 fallhoehe_einbau :: ${P_B}`, `M187-05 Fe_gehalt :: ${P_BC}`, `M187-05 p_grund_beladung :: ${P_BC}`,
      `M187-05 EBCT :: ${P_C}`, `M187-05 v_filter_aufstrom :: ${P_C}`, `M187-05 v_filter_abstrom :: ${P_C}`, `M187-05 h_FK_SS :: ${P_C}`, `M187-05 S_PO4P_SS_zu :: ${P_C}`, `M187-05 S_PO4P_SS_ab :: ${P_C}`,
      `M187-06 GAK_volumenanteil_oben :: ${SPUR_BC}`, `M187-06 GAK_volumenanteil_unten :: ${SPUR_BC}`, `M187-06 CaCO3_massenanteil_GAK :: ${SPUR_BC}`, `M187-06 Q_T_d_aM :: ${SPUR_C}`, `M187-06 beschickungsdauer_segment :: ${SPUR_C}`, `M187-06 trockenzeit_nach_vollbeschickung :: ${SPUR_C}`,
      `M187-07 UV_dosis :: ${UV_JA}`, `M187-07 pufferschicht_carbonatbrechsand :: ${P_A}`, `M187-07 betriebsdauer_jahre :: ${P_A}`,
      `M187-09 h_FK_CaCO3 :: ${CARBONAT_JA}`, `M187-09 CaCO3_massenanteil_carbo :: ${CARBONAT_JA}`, `M187-09 anzahl_sorptionsstufen :: ${P_C}`, `M187-09 sorptionsstufen :: ${P_C}`, `M187-09 sorptionsstufen_count :: ${P_C}`, `M187-09 ebct_min_stufe :: ${P_C}`, `M187-09 h_FK_SS_calc :: ${P_C}`,
      `M187-11 h_FK_min_spur :: ${SPUR_BC}`, `M187-11 q_Dr_RBF_limit_spur :: ${SPUR_NOT_D}`, `M187-11 q_Dr_RBF_vorgabe_spur :: ${SPUR_NOT_D}`,
      `M187-13 filterschichten :: ${SPUR_BC}`, `M187-13 h_FK_lagen :: ${SPUR_BC}`, `M187-13 h_Draen_lagen :: ${SPUR_BC}`, `M187-13 schichten_gak_verletzungen :: ${SPUR_BC}`,
      `M187-14 filtersegmente :: ${SPUR_C}`, `M187-14 V_segment_soll :: ${SPUR_C}`, `M187-14 segmente_count :: ${SPUR_C}`, `M187-14 segmente_unterdimensioniert :: ${SPUR_C}`, `M187-14 A_F_segmente :: ${SPUR_C}`,
      `M187-16 KBE :: ${MIKRO}`, `M187-16 MPN :: ${MIKRO}`, `M187-16 PBE :: ${MIKRO}`, `M187-16 logstufen_rueckhalt :: ${MIKRO}`,
      `M187-16 q_Dr_RBF_limit_mikro :: ${MIKRO}`, `M187-16 h_FK_min_mikro :: ${MIKRO}`, `M187-16 indikatororganismen :: ${MIKRO}`, `M187-16 log_red_min :: ${MIKRO}`, `M187-16 organismen_count :: ${MIKRO}`,
      `M187-18 UV_dosis_min :: ${UV_JA}`,
      `M187-19 stoffstromtrennung :: ${CSB_HOCH}`,
      `M187-20 B_CSB :: ${DATEN_JA}`, `M187-20 A_F_pro_AEb :: ${DATEN_NEIN}`,
      `M187-20 CSB_fracht_d :: ${DATEN_JA}`, `M187-20 A_F_min_ohne_daten :: ${DATEN_NEIN}`, `M187-20 B_CSB_calc :: ${DATEN_JA}`,
      `M187-22 carbonatschicht_nachweis :: ${CARBONAT_JA}`,
    ]);
    expect(rules).toHaveLength(58);
  });

  it('G-A3 key-string equality: table keys equal the driving prod enum value strings exactly (capture 2026-09-18)', () => {
    expect(enumValues('M187-01 sonderanwendung')).toEqual([...APP_TOKENS]);
    expect(enumValues('M187-05 verfahrensvariante_p')).toEqual([...P_TOKENS]);
    expect(enumValues('M187-06 verfahrensvariante_p')).toEqual([...P_TOKENS]);
    expect(enumValues('M187-06 verfahrensvariante_spurenstoffe')).toEqual([...SPUR_TOKENS]);
    expect(enumValues('M187-11 verfahrensvariante_spurenstoffe')).toEqual([...SPUR_TOKENS]);
    expect(enumValues('M187-18 uv_eingesetzt')).toEqual(['ja', 'nein']);
    expect(enumValues('M187-21 carbonatschicht_vorhanden')).toEqual(['ja', 'nein']);
    expect(enumValues('M187-21 filtervegetation')).toEqual(['regio_stauden', 'gehoelze', 'schilf', 'keine']);
    expect(enumValues('M187-20 betriebsmodus')).toEqual(['vollstrom', 'teilstrom']);
    expect(s5LimitsPAsTable().rows.map((r) => r.keys.variante_p)).toEqual(enumValues('M187-06 verfahrensvariante_p'));
    expect(tabelle3AsTable().rows.map((r) => r.keys.variante_p)).toEqual(enumValues('M187-06 verfahrensvariante_p'));
    expect(s5LimitsSpurAsTable().rows.map((r) => r.keys.variante_spur)).toEqual(enumValues('M187-11 verfahrensvariante_spurenstoffe'));
    expect(s5LimitsAppAsTable().rows.map((r) => r.keys.sonderanwendung)).toEqual(enumValues('M187-01 sonderanwendung'));
    expect(s5335UvAsTable().rows.map((r) => r.keys.uv_eingesetzt)).toEqual(enumValues('M187-18 uv_eingesetzt'));
    // the created select's options are the two printed cases of L792
    expect((byKey('M187-20', 'daten_vorhanden').enum_values as Array<{ value: string }>).map((o) => o.value)).toEqual(['ja', 'nein']);
    // register enum columns: the three printed indicator organisms (L661) and the three Tab.-2 units (L386 / L389 / L391)
    const ind = registerCfg('M187-16', 'indikatororganismen');
    expect(ind.columns.find((c) => c.key === 'organismus')!.options).toEqual(['e_coli', 'enterokokken', 'coliphagen']);
    expect(ind.columns.find((c) => c.key === 'einheit')!.options).toEqual(['kbe', 'mpn', 'pbe']);
    // BILD3 lookup_key rows are the four printed layers
    expect(bild3AsTable().rows.map((r) => r.keys.lage)).toEqual(['1', '2', '3', '4']);
  });

  it('lookup_fill bindings: keys[].column equal the table key_columns in order, value column exists, data_type number|text (amendment C), every key symbol is on the fill worksheet (own or inherited per capture); no existing input is re-bound', () => {
    const tables = { S5_LIMITS_P: s5LimitsPAsTable(), S5_LIMITS_SPUR: s5LimitsSpurAsTable(), S5_LIMITS_APP: s5LimitsAppAsTable(), S5_3_3_5_UV: s5335UvAsTable(), TABELLE3: tabelle3AsTable() } as const;
    const inherited = (w: string) => Object.entries(prior).filter(([k, v]) => k.includes(' ') && k !== 'sections' && k !== 'equations' && k !== '_meta' && ((v as Row).consumer_worksheets ?? []).includes(w)).map(([k]) => k.split(' ')[1]);
    const symbolsOn = (w: string) => new Set([
      ...Object.keys(prior).filter((k) => k.startsWith(`${w} `)).map((k) => k.slice(w.length + 1)),
      ...inherited(w),
      ...FIELD_CONFIGS.filter((e) => e.worksheet === w && e.create).map((e) => e.symbol),
    ]);
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill')) {
      const t = tables[e.lookup!.table_code as keyof typeof tables];
      expect(t, `${e.symbol} table`).toBeDefined();
      expect(e.lookup!.keys.map((k) => k.column)).toEqual(t.key_columns);
      expect(t.value_columns.map((c) => c.name)).toContain(e.lookup!.value);
      expect(e.create, `${e.symbol} is a created twin`).toBeDefined(); // E-2 rule: never re-bind an existing input
      expect(['number', 'text']).toContain(e.create!.data_type);
      for (const k of e.lookup!.keys) expect(symbolsOn(e.worksheet).has(k.from_symbol), `${e.symbol} key ${k.from_symbol} on ${e.worksheet}`).toBe(true);
    }
    // the branch switch reaches exactly five worksheets (capture) — the fills keyed on it sit on one of them
    expect(priorRow('M187-01 sonderanwendung').consumer_worksheets).toEqual(['M187-06', 'M187-11', 'M187-16', 'M187-20', 'M187-22']);
    expect(priorRow('M187-06 verfahrensvariante_p').consumer_worksheets).toEqual(['M187-06', 'M187-08', 'M187-09', 'M187-07']);
    expect(priorRow('M187-11 verfahrensvariante_spurenstoffe').consumer_worksheets).toEqual(['M187-12', 'M187-14', 'M187-13', 'M187-11', 'M187-15']);
    expect(priorRow('M187-12 q_Dr_RBF').consumer_worksheets).toEqual(['M187-16', 'M187-14', 'M187-13', 'M187-11']); // q_Dr_RBF is in scope on -11 and -16 for the STAGED gates
    expect(priorRow('M187-08 h_FK').consumer_worksheets).toEqual(['M187-22', 'M187-16', 'M187-06', 'M187-14', 'M187-13', 'M187-11', 'M187-21']);
    expect(priorRow('M187-21 carbonatschicht_vorhanden').consumer_worksheets).toEqual(['M187-22']); // M187-22-D5 reads it
    for (const s of ['h_FK_min_p', 'h_FK_min_spur', 'q_Dr_RBF_limit_spur', 'q_Dr_RBF_limit_mikro', 'h_FK_min_mikro', 'UV_dosis_min']) expect(FIELD_CONFIGS.find((e) => e.symbol === s)!.lookup!.role).toBe('limit');
    // the text fills carry the printed strings (Tab. 3 cells, the §5.2.3.1 wording) — never a numeric bound (SR-2)
    for (const s of [...TAB3_FILL_SYMBOLS, 'q_Dr_RBF_vorgabe_spur']) expect(FIELD_CONFIGS.find((e) => e.symbol === s)!.create!.data_type).toBe('text');
  });

  it('registers: filterschichten (BILD3 row picker + fills + GAK badge), sorptionsstufen (h_FK,SS per row), filtersegmente (Q_T_d_aM read in row scope), teilfilterbecken, klein_rbf_elemente, indikatororganismen; footers = the equation outputs; no override block', () => {
    const fs = registerCfg('M187-13', 'filterschichten');
    expect(fs.columns.filter((c) => c.type === 'lookup_key').map((c) => c.key)).toEqual(['lage']);
    expect(fs.columns.filter((c) => c.type === 'lookup_value').map((c) => c.lookup!.value)).toEqual(['material', 'dicke_cm', 'gak_vol_min_pct', 'gak_vol_max_pct', 'caco3_massenanteil_pct', 'filterwirksam']);
    expect(fs.columns.find((c) => c.key === 'dicke_ist_cm')).toMatchObject({ type: 'number', required: true });
    expect(fs.columns.find((c) => c.key === 'gak_ok')!.expr).toBe(GAK_OK_EXPR);
    expect(fs.footer).toEqual(['h_FK_lagen', 'h_Draen_lagen', 'schichten_gak_verletzungen']);
    const ss = registerCfg('M187-09', 'sorptionsstufen');
    expect(ss.columns.find((c) => c.key === 'h_fk_ss')!.expr).toBe(H_FK_SS_ROW_EXPR);
    expect(ss.footer).toEqual(['sorptionsstufen_count', 'ebct_min_stufe']);
    const seg = registerCfg('M187-14', 'filtersegmente');
    expect(seg.columns.find((c) => c.key === 'v_soll_m3')!.expr).toBe(V_SOLL_ROW_EXPR);
    expect([...extractSymbols(parseExpression(V_SOLL_ROW_EXPR)!)]).toEqual(['Q_T_d_aM']); // own input of M187-14 (capture)
    expect(priorRow('M187-14 Q_T_d_aM')).toBeDefined();
    expect(seg.footer).toEqual(['segmente_count', 'V_segment_soll', 'segmente_unterdimensioniert', 'A_F_segmente']);
    const tf = registerCfg('M187-20', 'teilfilterbecken');
    expect(tf.columns.map((c) => c.key)).toEqual(['label', 'flaeche_m2', 'in_betrieb', 'foerder_min_l_min', 'beschickung_soll_l']);
    expect(tf.footer).toEqual(['teilfilter_count', 'teilfilter_rest', 'A_F_gesamt', 'A_F_aktiv']);
    const kl = registerCfg('M187-22', 'klein_rbf_elemente');
    expect(kl.columns.filter((c) => c.required).map((c) => c.key)).toEqual(['label', 'a_b_a_m2', 'a_f_m2']);
    expect(kl.footer).toEqual(['elemente_count', 'A_b_a_sum_klein', 'A_F_sum_klein', 'A_F_anteil_calc', 'elemente_unter_1m2']);
    const ind = registerCfg('M187-16', 'indikatororganismen');
    expect(ind.columns.find((c) => c.key === 'log_red')!.expr).toBe(LOG_RED_EXPR);
    expect(ind.footer).toEqual(['organismen_count', 'log_red_min']);
    for (const r of FIELD_CONFIGS.filter((x) => x.widget === 'register')) expect((r.ui_config as RegisterUiConfig).override).toBeUndefined();
  });

  it('visibility never lands on a cross-worksheet producer (self-consumer entries are guard-inert since Task 12b); the refused targets are pinned (m187-C-2 … C-4); created fields sit in captured sections', () => {
    for (const e of FIELD_CONFIGS.filter((x) => x.visible_when && !x.create)) {
      const row = priorRow(`${e.worksheet} ${e.symbol}`);
      expect(row, `${e.worksheet} ${e.symbol} captured`).toBeDefined();
      expect((row.consumer_worksheets ?? []).filter((w) => w !== e.worksheet), `${e.worksheet} ${e.symbol} cross-worksheet consumers`).toEqual([]);
    }
    expect(FIELD_CONFIGS.filter((x) => x.visible_when && !x.create && (priorRow(`${x.worksheet} ${x.symbol}`).consumer_worksheets ?? []).length > 0)).toHaveLength(27); // the fix-round-1 re-emits
    // the brief's targets that are consumed (by another worksheet or by their own — an import artefact) — untouched, STAGED
    expect(priorRow('M187-18 UV_dosis').consumer_worksheets).toEqual(['M187-16']);                 // C-4
    expect(priorRow('M187-21 h_FK_CaCO3').consumer_worksheets).toEqual(['M187-22']);               // C-3
    expect(priorRow('M187-21 CaCO3_massenanteil_carbo').consumer_worksheets).toEqual(['M187-22']); // C-3
    expect(priorRow('M187-20 B_CSB').consumer_worksheets).toEqual(['M187-20']);                    // C-5 (self-consumer)
    expect(priorRow('M187-20 A_F_pro_AEb').consumer_worksheets).toEqual(['M187-20']);              // C-5 (self-consumer)
    expect(priorRow('M187-05 beta_wert').consumer_worksheets).toEqual(['M187-05']);                // X-3
    for (const [w, s] of [['M187-18', 'UV_dosis'], ['M187-21', 'h_FK_CaCO3'], ['M187-21', 'CaCO3_massenanteil_carbo'], ['M187-13', 'GAK_volumenanteil_oben'], ['M187-14', 'Q_T_d_aM']] as const) expect(FIELD_CONFIGS.find((e) => e.worksheet === w && e.symbol === s), `${w} ${s}`).toBeUndefined();
    for (const s of ['h_FK', 'q_Dr_RBF', 'beta_wert']) expect(FIELD_CONFIGS.find((e) => e.symbol === s), s).toBeUndefined(); // multi-consumed / gate-bearing (G-11)
    expect(() => emitFieldConfigSql('m187', [{ standard: STD, worksheet: 'M187-18', symbol: 'UV_dosis', widget: 'scalar', ui_config: null, visible_when: UV_JA, verification_quote: 'q' }], [], prior)).toThrow(/consumed/);
    // Task 12b: B_CSB's ONLY captured consumer is its own worksheet (M187-20, the C-5 self-consumer oddity above) — the guard now
    // strips the owner worksheet before deciding, so this is no longer a producer and the rule is NOT refused (m187 X-3 candidate for re-emit).
    expect(() => emitFieldConfigSql('m187', [{ standard: STD, worksheet: 'M187-20', symbol: 'B_CSB', widget: 'scalar', ui_config: null, visible_when: DATEN_JA, verification_quote: 'q' }], [], prior)).not.toThrow();
    // section rules: every field-bearing section of every worksheet holds a consumed producer (C-2) — EXCEPT M187-16 B and M187-22 D, whose only
    // in-section "producers" (KBE/logstufen_rueckhalt/MPN/PBE resp. A_b_a/A_F/A_F_anteil_Aba/AFS63/b_krit/b_R_a/eta_AFS63/h_RBF) are all self-consumer-only
    // (the same X-3 oddity) — since Task 12b those two sections are NOT refused either (also re-emit candidates).
    for (const [ws, sec] of [['M187-06', 'B'], ['M187-11', 'B'], ['M187-13', 'B'], ['M187-19', 'B'], ['M187-20', 'B'], ['M187-21', 'B']] as const) {
      expect(() => emitFieldConfigSql('m187', [], [{ standard: STD, worksheet: ws, section_code: sec, visible_when: MIKRO, verification_quote: 'q' }], prior), `${ws} ${sec}`).toThrow(/consumed/);
    }
    for (const [ws, sec] of [['M187-16', 'B'], ['M187-16', 'D'], ['M187-22', 'B'], ['M187-22', 'D']] as const) {
      expect(() => emitFieldConfigSql('m187', [], [{ standard: STD, worksheet: ws, section_code: sec, visible_when: MIKRO, verification_quote: 'q' }], prior), `${ws} ${sec}`).not.toThrow();
    }
    // the consumer-free existing fields that DID take a rule
    expect(priorRow('M187-07 pufferschicht_carbonatbrechsand').consumer_worksheets).toBeNull();
    expect(priorRow('M187-09 anzahl_sorptionsstufen').consumer_worksheets).toBeNull();
    // prod self-consumer count (X-3): 125 of 139 fields carry consumers, 86 of them list their own worksheet (capture)
    const rows = Object.entries(prior).filter(([k]) => k.includes(' ') && !['sections', 'equations', '_meta'].includes(k)) as Array<[string, Row]>;
    expect(rows).toHaveLength(139);
    expect(rows.filter(([, v]) => (v.consumer_worksheets ?? []).length > 0)).toHaveLength(125);
    expect(rows.filter(([k, v]) => (v.consumer_worksheets ?? []).includes(k.split(' ')[0]))).toHaveLength(86);
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) {
      expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
      expect(['B', 'C', 'D']).toContain(e.create!.section_code);
    }
    // the four prod equations: Gl. 1 / Gl. 2 duplicated on M187-09 and M187-22 (R-1)
    expect(Object.keys(prior.equations!)).toEqual(['M187-09 1', 'M187-09 2', 'M187-22 1', 'M187-22 2']);
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin)', () => {
    const { up, down } = emitFieldConfigSql('m187', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    const files = fieldConfigFilesFor('m187', '20260917101210');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(30);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(49);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(4);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
  });
});
