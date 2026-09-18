/**
 * Plan 3 Task 14 — DWA-A-178 field configs: every entry parses through the
 * zod contract, the key-string equality rule (G-A3) holds against the captured
 * prod enums and the seeded tables, lookup_fills sit on the worksheet of their
 * keys, visibility never lands on a consumed producer or a gate-read symbol
 * (pinned against the capture, incl. the refusals that went to STAGED), the
 * consumer facts behind every `pending` rule are pinned, and the committed
 * migration equals a fresh emit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELD_CONFIGS, SECTION_VISIBILITY, MISCH, TRENN_STRASSE, STRASSE, STRASSE_WSG, RRL, FRACHTPFADE, B_ROW_EXPR, ETA_TAB1_EXPR, ZULAESSIG_EXPR, B_AB_EXPR } from '../field-configs/a178';
import type { PriorSnapshot } from '../field-configs/types';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { parseCondition, parseNumeric, quotedComparisonLiterals, parseExpression } from '@/lib/expr';
import { tabelle1VsAsTable, s6145AsTable, tabelle2AsTable, VORSTUFE_TYPEN } from '../regulation-tables-seed-a178';
import { emitFieldConfigSql, fieldConfigFilesFor, loadPriorSnapshot, producerChain, gateReaders } from '../../../../scripts/regulation-tables/emit-field-configs-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const prior: PriorSnapshot = loadPriorSnapshot(join(ROOT, 'src/lib/eval/field-configs/a178.prior.json'));
const norm = (s: string) => s.replace(/\r\n/g, '\n');
type Row = { enum_values?: unknown; consumer_worksheets?: string[] | null; data_type?: string; section_code?: string | null };
const priorRow = (key: string) => (prior as unknown as Record<string, Row>)[key];
const enumValues = (key: string): string[] => (priorRow(key).enum_values as Array<{ value: string }>).map((e) => e.value);
const byKey = (ws: string, sym: string) => FIELD_CONFIGS.find((e) => e.worksheet === ws && e.symbol === sym)!;
const registerCfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: byKey(ws, sym).ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const STD = 'DWA-A-178';
const q = (ws: string, sym: string, visible_when: string) => ({ standard: STD, worksheet: ws, symbol: sym, widget: 'scalar' as const, ui_config: null, visible_when, verification_quote: 'q' });

describe('DWA-A-178 field configs (Plan 3 Task 14)', () => {
  it('every entry parses through parseFieldConfig; visible_when / register exprs parse; create descriptions carry the rollback selector; no section rules', () => {
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

  it('counts: 32 field entries (29 create, 3 UPDATE), widgets by kind, the eight visibility rules', () => {
    expect(FIELD_CONFIGS).toHaveLength(32);
    expect(FIELD_CONFIGS.filter((e) => e.create)).toHaveLength(29);
    expect(FIELD_CONFIGS.filter((e) => !e.create).map((e) => `${e.worksheet} ${e.symbol}`)).toEqual(['A178-07 v_spez_grobstoff', 'A178-11 V_RRL', 'A178-17 t_RR_E_n1']);
    const byWidget = (w: string) => FIELD_CONFIGS.filter((e) => e.widget === w).map((e) => `${e.worksheet} ${e.symbol}`);
    expect(byWidget('register')).toEqual(['A178-04 teilflaechen_178', 'A178-13 frachtpfade', 'A178-18 iterationen', 'A178-18 betriebsbefunde']);
    expect(byWidget('lookup_fill')).toEqual(['A178-02 h_FK_min_tab', 'A178-13 eta_VS_tab1']);
    expect(byWidget('select_one')).toEqual(['A178-13 vorstufe_typ']);
    expect(byWidget('attestation')).toEqual(['A178-02 spezifische_ziele_formuliert', 'A178-02 leichtfluessigkeitsfang_vorgesehen', 'A178-05 fremdwasser_massnahmen_geprueft']);
    expect(byWidget('scalar')).toEqual(['A178-07 v_spez_grobstoff', 'A178-11 V_RR', 'A178-11 V_FK', 'A178-11 V_RRL', 'A178-17 t_RR_E_n1']);
    expect(byWidget('derived')).toEqual([
      'A178-04 A_E_b_a_calc', 'A178-04 B_RBF_zu_calc', 'A178-04 teilflaechen_count',
      'A178-07 v_spez_grobstoff_min', 'A178-07 b_krit_tab', 'A178-07 q_Dr_RBF_vorgabe',
      'A178-10 A_F_strasse', 'A178-11 V_RBF_calc',
      'A178-13 b_F_calc', 'A178-13 C_RBF_zu_calc', 'A178-13 B_RBF_ab_calc', 'A178-13 frachtpfade_unzulaessig',
      'A178-18 iteration_count_calc', 'A178-18 A_F_last', 'A178-18 b_F_last', 'A178-18 iterationen_konvergiert', 'A178-18 befunde_count',
    ]);
    expect(FIELD_CONFIGS.filter((e) => e.visible_when).map((e) => `${e.worksheet} ${e.symbol} :: ${e.visible_when}`)).toEqual([
      `A178-02 spezifische_ziele_formuliert :: ${STRASSE}`,
      `A178-02 leichtfluessigkeitsfang_vorgesehen :: ${STRASSE_WSG}`,
      'A178-05 fremdwasser_massnahmen_geprueft :: fremdwasser_relevant == true',
      `A178-07 v_spez_grobstoff :: ${TRENN_STRASSE}`,
      `A178-07 v_spez_grobstoff_min :: ${TRENN_STRASSE}`,
      `A178-10 A_F_strasse :: ${STRASSE}`,
      `A178-11 V_RRL :: ${RRL}`,
      `A178-17 t_RR_E_n1 :: ${MISCH}`,
    ]);
  });

  it('G-A3 key-string equality: S6_1_4_5 keys = prod system_type tokens; TABELLE1_VS keys = the created select; drivers as captured (booleans, enums)', () => {
    expect(enumValues('A178-02 system_type')).toEqual(['misch', 'trenn', 'strasse']);
    expect(s6145AsTable().rows.map((r) => r.keys.system_type)).toEqual(['misch', 'trenn', 'strasse']);
    const vt = byKey('A178-13', 'vorstufe_typ').enum_values as Array<{ value: string }>;
    expect(vt.map((o) => o.value)).toEqual(VORSTUFE_TYPEN.map((v) => v.value));
    expect(tabelle1VsAsTable().rows.map((r) => r.keys.vorstufe_typ)).toEqual(vt.map((o) => o.value));
    expect(enumValues('A178-07 becken_typ')).toEqual(['fang', 'durchlauf']);
    expect(priorRow('A178-07 rrl_vorhanden').data_type).toBe('boolean');
    expect(priorRow('A178-05 fremdwasser_relevant').data_type).toBe('boolean');
    expect(enumValues('A178-01 wasserschutzgebiet')).toEqual(['zone_none', 'zone_I', 'zone_II', 'zone_IIIa', 'zone_IIIb']);
    // the register enums are this task's tokens; the TABELLE2 picker stores the row_key = befund token
    expect(FRACHTPFADE.map((p) => p.value)).toEqual(['dr_rbf', 'fue', 'dr_rrl']);
    expect(registerCfg('A178-13', 'frachtpfade').columns.find((c) => c.key === 'pfad')?.options).toEqual(['dr_rbf', 'fue', 'dr_rrl']);
    expect(tabelle2AsTable().rows).toHaveLength(15);
    expect(registerCfg('A178-18', 'betriebsbefunde').columns.find((c) => c.key === 'befund')?.lookup).toEqual({ table_code: 'TABELLE2', group_by: 'group_label' });
  });

  it('lookup_fill bindings: keys[].column equal the table key_columns, value column exists, data_type number (amendment C), keys live on the fill worksheet; the existing inputs keep their widgets (E-1 / E-2)', () => {
    const tables = { S6_1_4_5: s6145AsTable(), TABELLE1_VS: tabelle1VsAsTable() } as const;
    const symbolsOn = (ws: string) => new Set([
      ...Object.keys(prior).filter((k) => k.startsWith(`${ws} `)).map((k) => k.slice(ws.length + 1)),
      ...FIELD_CONFIGS.filter((e) => e.worksheet === ws && e.create).map((e) => e.symbol),
    ]);
    for (const e of FIELD_CONFIGS.filter((x) => x.widget === 'lookup_fill')) {
      const t = tables[e.lookup!.table_code as keyof typeof tables];
      expect(t, `${e.symbol} table`).toBeDefined();
      expect(e.lookup!.keys.map((k) => k.column)).toEqual(t.key_columns);
      expect(t.value_columns.map((c) => c.name)).toContain(e.lookup!.value);
      expect(e.create?.data_type).toBe('number');
      for (const k of e.lookup!.keys) expect(symbolsOn(e.worksheet).has(k.from_symbol), `${e.symbol} key ${k.from_symbol} on ${e.worksheet}`).toBe(true);
    }
    expect(byKey('A178-02', 'h_FK_min_tab').lookup!.role).toBe('limit');
    expect(byKey('A178-13', 'eta_VS_tab1').lookup!.role).toBe('value');
    // h_FK_required (-07) keeps its input: system_type is NOT consumed on A178-07 (a262e trap 1) — the fill sits beside its key on -02
    expect(priorRow('A178-02 system_type').consumer_worksheets).toEqual(['A178-04', 'A178-06', 'A178-09']);
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'h_FK_required')).toBeUndefined();
    expect(priorRow('A178-07 h_FK_required').consumer_worksheets).toBeNull();
    // eta_VS keeps its input (self-consumed only; a lookup_fill would be read-only while vorstufe_typ is unset — amendment J)
    expect(FIELD_CONFIGS.find((e) => e.symbol === 'eta_VS')).toBeUndefined();
    expect(priorRow('A178-13 eta_VS').consumer_worksheets).toEqual(['A178-13']);
    expect(priorRow('A178-13 eta_VS').data_type).toBe('number');
  });

  it('registers: the Teilflächen row switches Gl. 2 / Gl. 3 on the inherited system_type (e_0 column Misch-only); the Frachtpfade row reads Tab. 1 by path and the configuration from becken_typ / rrl_vorhanden; footers = the created outputs', () => {
    const teil = registerCfg('A178-04', 'teilflaechen_178');
    expect(teil.columns.map((c) => c.key)).toEqual(['label', 'a_e_b_a_i', 'b_r_a_i', 'b_r_a_rechenwert', 'abw_rechenwert', 'e_0_i', 'b_row']);
    expect(teil.columns.find((c) => c.key === 'e_0_i')?.visible_when).toBe(MISCH);
    expect(teil.columns.find((c) => c.key === 'b_row')?.expr).toBe(B_ROW_EXPR);
    expect(B_ROW_EXPR).toBe("if(system_type == 'misch', a_e_b_a_i * b_r_a_i * e_0_i / 100, a_e_b_a_i * b_r_a_i)");
    expect(teil.footer).toEqual(['A_E_b_a_calc', 'B_RBF_zu_calc', 'teilflaechen_count']);
    expect(priorRow('A178-02 system_type').consumer_worksheets).toContain('A178-04'); // the row switch resolves on -04
    expect(priorRow('A178-06 b_R_a').consumer_worksheets).toEqual(['A178-09']);       // NOT on -04 → per-row column (J-2 / D-2)
    expect(priorRow('A178-07 e_0').consumer_worksheets).toEqual(['A178-09']);         // NOT on -04 → per-row column (D-3)
    const pf = registerCfg('A178-13', 'frachtpfade');
    expect(pf.columns.map((c) => c.key)).toEqual(['pfad', 'vq_m3', 'eta_tab1', 'zulaessig', 'b_ab']);
    expect(pf.columns.find((c) => c.key === 'eta_tab1')?.expr).toBe(ETA_TAB1_EXPR);
    expect(pf.columns.find((c) => c.key === 'zulaessig')?.expr).toBe(ZULAESSIG_EXPR);
    expect(pf.columns.find((c) => c.key === 'b_ab')?.expr).toBe(B_AB_EXPR);
    expect(pf.footer).toEqual(['b_F_calc', 'B_RBF_ab_calc', 'frachtpfade_unzulaessig']);
    // the worksheet symbols the row exprs read are in scope on A178-13: own eta_VS, inherited C_RBFA_zu (-12), becken_typ / rrl_vorhanden (-07), A_F (-10)
    expect(priorRow('A178-12 C_RBFA_zu').consumer_worksheets).toEqual(['A178-13']);
    expect(priorRow('A178-07 becken_typ').consumer_worksheets).toEqual(['A178-13']);
    expect(priorRow('A178-07 rrl_vorhanden').consumer_worksheets).toEqual(['A178-13', 'A178-17']);
    expect(priorRow('A178-10 A_F').consumer_worksheets).toEqual(['A178-11', 'A178-13', 'A178-16']);
    expect(registerCfg('A178-18', 'iterationen').footer).toEqual(['iteration_count_calc', 'A_F_last', 'b_F_last', 'iterationen_konvergiert']);
    expect(registerCfg('A178-18', 'betriebsbefunde').footer).toEqual(['befunde_count']);
    for (const r of FIELD_CONFIGS.filter((x) => x.widget === 'register')) expect((r.ui_config as RegisterUiConfig).override).toBeUndefined(); // TABELLE1 locked, TABELLE2 has no value override → no override block
    // every footer symbol is a created derived field on the same worksheet
    for (const r of FIELD_CONFIGS.filter((x) => x.widget === 'register')) for (const f of (r.ui_config as RegisterUiConfig).footer ?? []) expect(byKey(r.worksheet, f)?.widget, `${r.symbol} footer ${f}`).toBe('derived');
  });

  it('string-literal rule (Task 13b): no quoted literal in any expression is a register column key or a symbol of its worksheet', () => {
    const literals = (src: string): string[] => { const n = parseExpression(src); return n ? quotedComparisonLiterals(n).map(String) : []; };
    const symbolsOn = (ws: string) => new Set([
      ...Object.keys(prior).filter((k) => k.startsWith(`${ws} `)).map((k) => k.slice(ws.length + 1)),
      ...FIELD_CONFIGS.filter((e) => e.worksheet === ws && e.create).map((e) => e.symbol),
    ]);
    let walked = 0;
    for (const e of FIELD_CONFIGS) {
      const keys = new Set(e.widget === 'register' ? (e.ui_config as RegisterUiConfig).columns.map((c) => c.key) : []);
      const exprs = [e.visible_when ?? '', ...(e.widget === 'register' ? (e.ui_config as RegisterUiConfig).columns.flatMap((c) => [c.expr ?? '', c.visible_when ?? '']) : [])].filter(Boolean);
      for (const x of exprs) {
        walked++;
        for (const lit of literals(x)) {
          expect(keys.has(lit), `${e.symbol}: literal '${lit}' is a column key`).toBe(false);
          expect(symbolsOn(e.worksheet).has(lit), `${e.symbol}: literal '${lit}' is a symbol of ${e.worksheet}`).toBe(false);
        }
      }
    }
    expect(walked).toBe(8 + 4 + 3); // 8 field rules + teilflaechen (e_0_i visible_when, b_r_a_rechenwert, abw, b_row) + frachtpfade (eta_tab1, zulaessig, b_ab)
  });

  it('visibility never lands on a consumed producer or a gate-read symbol; the refused targets are pinned (C-2 / C-3 / G-1); the pending rules name drivers not inherited on their worksheet (C-1)', () => {
    for (const e of FIELD_CONFIGS.filter((x) => x.visible_when && !x.create)) {
      const row = priorRow(`${e.worksheet} ${e.symbol}`);
      expect(row, `${e.worksheet} ${e.symbol} captured`).toBeDefined();
      expect(row.consumer_worksheets ?? []).toEqual([]);
      expect(gateReaders(prior, e.worksheet, e.symbol, e.visible_when!)).toEqual([]);
    }
    // e_0 (-07) is consumed by -09 → C-2
    expect(producerChain(prior, 'A178-07', 'e_0')).toBe('e_0 (consumed by A178-09)');
    expect(() => emitFieldConfigSql('a178', [q('A178-07', 'e_0', MISCH)], [], prior)).toThrow(/e_0 \(consumed by A178-09\)/);
    // VQ_FU / eta_RR / VQ_Dr_RRL / eta_RRL feed Gl. 6 / 7 whose b_F is consumed by -16; B_RRL feeds Gl. 11 → C-3 (transitive guard; self-consumers ignored)
    expect(producerChain(prior, 'A178-13', 'VQ_FU')).toBe('VQ_FU → Gl.6 b_F (consumed by A178-16)');
    expect(producerChain(prior, 'A178-13', 'eta_RRL')).toBe('eta_RRL → Gl.7 b_F (consumed by A178-16)');
    expect(producerChain(prior, 'A178-14', 'B_RRL')).toBe('B_RRL → Gl.11 B_RBFA_ab (consumed by A178-16)');
    expect(() => emitFieldConfigSql('a178', [q('A178-13', 'VQ_FU', "becken_typ == 'durchlauf'")], [], prior)).toThrow(/VQ_FU → Gl\.6 b_F/);
    expect(() => emitFieldConfigSql('a178', [q('A178-14', 'B_RRL', RRL)], [], prior)).toThrow(/B_RRL → Gl\.11 B_RBFA_ab/);
    // n_RBF (-17) is read by the unguarded gate REQ-22 → G-1 (gate-aware guard)
    expect(producerChain(prior, 'A178-17', 'n_RBF')).toBeNull();
    expect(gateReaders(prior, 'A178-17', 'n_RBF', MISCH).map((r) => [r.code, r.gate.condition])).toEqual([['REQ-22', 'n_RBF >= 10']]);
    expect(() => emitFieldConfigSql('a178', [q('A178-17', 'n_RBF', MISCH)], [], prior)).toThrow(/n_RBF read by gate REQ-22 .* STAGE as a G-block/);
    // t_RR_E_n1 (-17) is NOT read by REQ-22 and REQ-21 lives on -16 (it reads t_RR_E_n1 without inheriting it — X-1)
    expect(prior.gates!['A178-16 REQ-21']).toMatchObject({ condition: "IF system_type == 'misch' THEN t_RR_E_n1 <= 48", symbols: ['system_type', 't_RR_E_n1'] });
    expect(priorRow('A178-17 t_RR_E_n1').consumer_worksheets).toBeNull();
    // the pending rules: their drivers are not inherited on the rule's worksheet (C-1) — visible and inert until the consumer edit
    for (const ws of ['A178-07', 'A178-10', 'A178-17']) expect(priorRow('A178-02 system_type').consumer_worksheets).not.toContain(ws);
    expect(priorRow('A178-07 rrl_vorhanden').consumer_worksheets).not.toContain('A178-11');
    // the rules that resolve today: system_type on -02 (own), wasserschutzgebiet inherited on -02, fremdwasser_relevant on -05 (own)
    expect(priorRow('A178-01 wasserschutzgebiet').consumer_worksheets).toEqual(['A178-02']);
    expect(priorRow('A178-05 fremdwasser_relevant')).toBeDefined();
    // the gates REQ-09 / REQ-10 / REQ-12 on A178-12 read symbols no A178-12 row carries or inherits (prod oddity, X-1)
    for (const s of ['e_0', 'n_RBF', 'v_spez_grobstoff', 'h_FK_required', 'system_type']) expect(priorRow(`A178-12 ${s}`)).toBeUndefined();
    expect(prior.gates!['A178-12 REQ-09'].symbols).toEqual(['e_0', 'n_RBF', 'system_type']);
    // 8 gates carry an EMPTY condition (manual at runtime) — REQ-01 / -03 / -04 / -05 / -06 / -08 / -17 / -28
    expect(Object.entries(prior.gates!).filter(([, g]) => g.parse_error).map(([k]) => k)).toEqual(['A178-01 REQ-01', 'A178-01 REQ-03', 'A178-04 REQ-04', 'A178-04 REQ-05', 'A178-04 REQ-06', 'A178-04 REQ-08', 'A178-09 REQ-17', 'A178-18 REQ-28']);
    // created fields sit in captured sections
    for (const e of FIELD_CONFIGS.filter((x) => x.create)) expect(`${e.worksheet} ${e.create!.section_code}` in prior.sections!, `${e.worksheet} ${e.symbol} section ${e.create!.section_code}`).toBe(true);
    // the 11 self-consumer entries the guard ignores (Task 12b; hygiene STAGED a178-X-5)
    const self = Object.entries(prior).filter(([k, v]) => k.includes(' ') && (v as Row).consumer_worksheets?.some((w) => k.startsWith(`${w} `))).map(([k]) => k);
    expect(self).toEqual(['A178-12 VQ_RBFA_zu', 'A178-13 eta_RR', 'A178-13 eta_RRL', 'A178-13 eta_VS', 'A178-13 VQ_Dr_RBF', 'A178-13 VQ_Dr_RRL', 'A178-13 VQ_FU', 'A178-14 B_Dr_RBF', 'A178-14 B_FU', 'A178-14 B_RRL', 'A178-14 B_VS']);
  });

  it('the committed migration + rollback equal a fresh emit against the committed prior (freshness pin, default refuse mode, no lint warning)', () => {
    const { up, down, warnings } = emitFieldConfigSql('a178', FIELD_CONFIGS, SECTION_VISIBILITY, prior);
    expect(warnings).toEqual([]);
    const files = fieldConfigFilesFor('a178', '20260917101410');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/^UPDATE fields f SET/gm) ?? []).length).toBe(3);
    expect((up.match(/^INSERT INTO fields/gm) ?? []).length).toBe(29);
    expect((up.match(/^UPDATE worksheet_sections/gm) ?? []).length).toBe(0);
    expect(up).not.toMatch(/^UPDATE fields f SET .*enum_values =/m); // D-1
  });
});
